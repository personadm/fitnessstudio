import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCurrentStudioId } from "@/lib/tenant";
import { Prisma } from "@prisma/client";
import type { ContactStatus, Gender } from "@prisma/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_STATUSES: ContactStatus[] = ["INTERESSENT", "NEUKUNDE", "KUNDE", "EHEMALIGER"];

interface IncomingRow {
  email: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  birthDate?: string;
  city?: string;
  phone?: string;
}

interface RequestBody {
  rows: IncomingRow[];
  targetStatus: string;
  locationId?: string | null;
  duplicateStrategy: string; // "skip" | "update_status" | "update_all"
}

function normalizeGender(raw?: string): Gender | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase();
  if (["m", "männlich", "maennlich", "male", "mann", "herr", "1"].includes(v)) return "MAENNLICH";
  if (["w", "f", "weiblich", "female", "frau", "2"].includes(v)) return "WEIBLICH";
  if (["d", "divers", "diverse", "non-binary", "nb", "3"].includes(v)) return "DIVERS";
  return undefined;
}

function isValidEmail(email: string): boolean {
  // Pragmatisch — nicht RFC-perfekt, aber filtert echten Müll raus
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Parst gängige Datumsformate aus Excel-Zellen:
 *  - "TT.MM.JJJJ" (z.B. "15.03.1985")
 *  - "JJJJ-MM-TT" (z.B. "1985-03-15")
 *  - ISO-Strings ("1985-03-15T00:00:00.000Z") aus XLSX raw:false
 *
 * Sanity-Check: Jahr zwischen 1900 und (heute - 5 Jahre) — verhindert dass
 * Spalten-Verwechsler (z.B. eine Telefonnummer als Datum) versehentlich
 * als Geburtsdatum gespeichert werden.
 */
function parseBirthDate(raw?: string): Date | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s) return undefined;

  let year = 0;
  let month = 0;
  let day = 0;

  // TT.MM.JJJJ
  const deMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(s);
  if (deMatch) {
    day = parseInt(deMatch[1], 10);
    month = parseInt(deMatch[2], 10);
    year = parseInt(deMatch[3], 10);
    if (year < 100) year += year < 30 ? 2000 : 1900; // 25 → 2025, 85 → 1985
  } else {
    // JJJJ-MM-TT (auch ISO-Strings, da der Datums-Teil vorne steht)
    const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
    } else {
      // Fallback: native Date.parse
      const t = Date.parse(s);
      if (!Number.isNaN(t)) {
        const d = new Date(t);
        year = d.getFullYear();
        month = d.getMonth() + 1;
        day = d.getDate();
      }
    }
  }

  if (!year || !month || !day) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  const nowYear = new Date().getFullYear();
  if (year < 1900 || year > nowYear - 5) return undefined;

  // Date in UTC (Mitternacht) — Geburtsdatum hat keine Zeitkomponente
  const d = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function cleanPhone(raw?: string): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim();
  if (!cleaned || cleaned.length > 40) return undefined;
  return cleaned;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const studioId = await getCurrentStudioId();
  if (!studioId) {
    return NextResponse.json({ ok: false, message: "Kein Studio-Kontext." }, { status: 400 });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Body ungültig." }, { status: 400 });
  }

  // Validierung der Top-Level-Parameter
  if (!Array.isArray(body.rows)) {
    return NextResponse.json({ ok: false, message: "rows fehlt." }, { status: 400 });
  }
  if (body.rows.length === 0) {
    return NextResponse.json({ ok: false, message: "Keine Zeilen zum Import." }, { status: 400 });
  }
  if (body.rows.length > 5000) {
    return NextResponse.json(
      { ok: false, message: "Maximal 5000 Zeilen pro Import." },
      { status: 400 },
    );
  }
  if (!VALID_STATUSES.includes(body.targetStatus as ContactStatus)) {
    return NextResponse.json({ ok: false, message: "Ungültiger Status." }, { status: 400 });
  }
  if (!["skip", "update_status", "update_all"].includes(body.duplicateStrategy)) {
    return NextResponse.json({ ok: false, message: "Ungültige Duplikat-Strategie." }, { status: 400 });
  }

  const targetStatus = body.targetStatus as ContactStatus;
  const strategy = body.duplicateStrategy;

  // locationId validieren — wenn gesetzt, muss sie existieren.
  // null oder leerer String bedeuten "kein Standort".
  let locationId: string | null = null;
  if (body.locationId) {
    const loc = await db.location.findFirst({
      where: { id: body.locationId, studioId },
      select: { id: true },
    });
    if (!loc) {
      return NextResponse.json(
        { ok: false, message: "Standort existiert nicht." },
        { status: 400 },
      );
    }
    locationId = loc.id;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: { row: number; email: string; reason: string }[] = [];

  // ── Phase 1: Zeilen validieren & parsen (kein DB-Zugriff) ──
  // Inner-Batch-Duplikate: Wenn dieselbe Mail mehrmals in der Datei steht,
  // verarbeiten wir nur die ERSTE und überspringen den Rest.
  type PreparedRow = {
    rowNum: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    gender: Gender | undefined;
    birthDate: Date | undefined;
    city: string | null;
    phone: string | undefined;
  };
  const prepared: PreparedRow[] = [];
  const seenInBatch = new Set<string>();

  for (let i = 0; i < body.rows.length; i++) {
    const raw = body.rows[i];
    const rowNum = i + 1;

    const email = String(raw.email ?? "").trim().toLowerCase();
    if (!email) {
      skipped++;
      continue;
    }
    if (!isValidEmail(email)) {
      errors.push({ row: rowNum, email, reason: "Ungültige E-Mail" });
      continue;
    }
    if (seenInBatch.has(email)) {
      skipped++;
      continue;
    }
    seenInBatch.add(email);

    prepared.push({
      rowNum,
      email,
      firstName: raw.firstName?.trim() || null,
      lastName: raw.lastName?.trim() || null,
      gender: normalizeGender(raw.gender),
      birthDate: parseBirthDate(raw.birthDate),
      city: raw.city?.trim() || null,
      phone: cleanPhone(raw.phone),
    });
  }

  // ── Phase 2: Bestehende Kontakte in EINER Query laden (statt N) ──
  const emails = prepared.map((p) => p.email);
  const existingList = emails.length
    ? await db.contact.findMany({
        where: { studioId, email: { in: emails } },
        select: { id: true, email: true },
      })
    : [];
  const existingMap = new Map(existingList.map((c) => [c.email, c.id]));

  // ── Phase 3: Partitionieren ──
  const toCreate = prepared.filter((p) => !existingMap.has(p.email));
  const existingRows = prepared.filter((p) => existingMap.has(p.email));
  if (strategy === "skip") {
    skipped += existingRows.length;
  }

  // ── Phase 4: Neue Kontakte gebündelt anlegen (createMany + Events) ──
  if (toCreate.length > 0) {
    try {
      const createData: Prisma.ContactCreateManyInput[] = toCreate.map((p) => ({
        studioId,
        email: p.email,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        ...(p.birthDate ? { birthDate: p.birthDate } : {}),
        ...(p.city ? { city: p.city } : {}),
        ...(p.phone ? { phone: p.phone } : {}),
        ...(locationId ? { locationId } : {}),
        status: targetStatus,
        source: "IMPORT",
        // Bei KUNDE/EHEMALIGER pragmatische Defaults für Membership-Dates.
        // signupAt nicht setzen — das ist Anmeldeformular-Sache.
        ...(targetStatus === "KUNDE" ? { memberSince: new Date() } : {}),
        ...(targetStatus === "EHEMALIGER" ? { memberUntil: new Date() } : {}),
      }));
      const res = await db.contact.createMany({ data: createData, skipDuplicates: true });
      created += res.count;

      // IDs der angelegten Kontakte nachladen, um die Event-Logs zu schreiben.
      const createdContacts = await db.contact.findMany({
        where: { studioId, email: { in: toCreate.map((p) => p.email) } },
        select: { id: true, email: true },
      });
      const createdMap = new Map(createdContacts.map((c) => [c.email, c.id]));
      const createEvents: Prisma.ContactEventCreateManyInput[] = [];
      for (const p of toCreate) {
        const id = createdMap.get(p.email);
        if (id) {
          createEvents.push({
            contactId: id,
            type: "IMPORTED_CREATED",
            meta: { targetStatus, rowNum: p.rowNum },
          });
        }
      }
      if (createEvents.length) await db.contactEvent.createMany({ data: createEvents });
    } catch (err) {
      console.error("[import] bulk create failed", err);
      const reason = err instanceof Error ? err.message : "Bulk-Insert fehlgeschlagen";
      for (const p of toCreate) errors.push({ row: p.rowNum, email: p.email, reason });
    }
  }

  // ── Phase 5: Bestehende Kontakte aktualisieren ──
  if (strategy !== "skip" && existingRows.length > 0) {
    if (strategy === "update_status") {
      // Einheitliche Daten → ein einziges updateMany.
      const data: Prisma.ContactUncheckedUpdateManyInput = { status: targetStatus };
      if (locationId !== null) data.locationId = locationId;
      try {
        const res = await db.contact.updateMany({
          where: { studioId, email: { in: existingRows.map((p) => p.email) } },
          data,
        });
        updated += res.count;
        await db.contactEvent.createMany({
          data: existingRows.map((p) => ({
            contactId: existingMap.get(p.email) as string,
            type: "IMPORTED_UPDATED",
            meta: { strategy, targetStatus, rowNum: p.rowNum },
          })),
        });
      } catch (err) {
        console.error("[import] bulk update_status failed", err);
        const reason = err instanceof Error ? err.message : "Bulk-Update fehlgeschlagen";
        for (const p of existingRows) errors.push({ row: p.rowNum, email: p.email, reason });
      }
    } else {
      // update_all: pro Zeile individuelle Daten → atomare Transaktions-Chunks.
      // Chunking vermeidet eine einzige riesige Transaktion auf dem Pooler.
      const CHUNK = 200;
      for (let off = 0; off < existingRows.length; off += CHUNK) {
        const chunk = existingRows.slice(off, off + CHUNK);
        try {
          await db.$transaction(
            chunk.map((p) => {
              const updateData: Prisma.ContactUncheckedUpdateInput = { status: targetStatus };
              if (p.firstName) updateData.firstName = p.firstName;
              if (p.lastName) updateData.lastName = p.lastName;
              if (p.gender) updateData.gender = p.gender;
              if (p.birthDate) updateData.birthDate = p.birthDate;
              if (p.city) updateData.city = p.city;
              if (p.phone) updateData.phone = p.phone;
              if (locationId !== null) updateData.locationId = locationId;
              return db.contact.update({
                where: { studioId_email: { studioId, email: p.email } },
                data: updateData,
              });
            }),
          );
          await db.contactEvent.createMany({
            data: chunk.map((p) => ({
              contactId: existingMap.get(p.email) as string,
              type: "IMPORTED_UPDATED",
              meta: { strategy, targetStatus, rowNum: p.rowNum },
            })),
          });
          updated += chunk.length;
        } catch (err) {
          console.error("[import] bulk update_all chunk failed", err);
          const reason = err instanceof Error ? err.message : "Bulk-Update fehlgeschlagen";
          for (const p of chunk) errors.push({ row: p.rowNum, email: p.email, reason });
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      total: body.rows.length,
      created,
      updated,
      skipped,
      errors: errors.length,
    },
    errors: errors.slice(0, 50), // max. 50 Fehlerdetails zurückgeben
  });
}
