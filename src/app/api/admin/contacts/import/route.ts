import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
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
    const loc = await db.location.findUnique({
      where: { id: body.locationId },
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

  // Inner-Batch-Duplikate: Wenn dieselbe Mail mehrmals in der Datei steht,
  // verarbeiten wir nur die ERSTE und überspringen den Rest.
  const seenInBatch = new Set<string>();

  for (let i = 0; i < body.rows.length; i++) {
    const raw = body.rows[i];
    const rowNum = i + 1;

    // E-Mail extrahieren und normalisieren
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

    const firstName = raw.firstName?.trim() || null;
    const lastName = raw.lastName?.trim() || null;
    const gender = normalizeGender(raw.gender);
    const birthDate = parseBirthDate(raw.birthDate);
    const city = raw.city?.trim() || null;
    const phone = cleanPhone(raw.phone);

    try {
      const existing = await db.contact.findUnique({ where: { email } });

      if (existing) {
        if (strategy === "skip") {
          skipped++;
          continue;
        }

        const updateData: {
          status?: ContactStatus;
          firstName?: string | null;
          lastName?: string | null;
          gender?: Gender;
          birthDate?: Date | null;
          city?: string | null;
          phone?: string | null;
          locationId?: string | null;
        } = {};

        if (strategy === "update_status") {
          updateData.status = targetStatus;
          // Standort beim "nur Status updaten" trotzdem setzen — User hat ihn
          // explizit gewählt, das ist die häufige Intention beim Bulk-Import
          // einer Standort-Liste mit gemischten Statuses.
          if (locationId !== null) updateData.locationId = locationId;
        } else if (strategy === "update_all") {
          updateData.status = targetStatus;
          if (firstName) updateData.firstName = firstName;
          if (lastName) updateData.lastName = lastName;
          if (gender) updateData.gender = gender;
          if (birthDate) updateData.birthDate = birthDate;
          if (city) updateData.city = city;
          if (phone) updateData.phone = phone;
          if (locationId !== null) updateData.locationId = locationId;
        }

        await db.contact.update({ where: { email }, data: updateData });
        await db.contactEvent.create({
          data: {
            contactId: existing.id,
            type: "IMPORTED_UPDATED",
            meta: { strategy, targetStatus, rowNum },
          },
        });
        updated++;
      } else {
        // Neu anlegen — alle vorhandenen Felder aus der Zeile
        const newContact = await db.contact.create({
          data: {
            email,
            firstName,
            lastName,
            gender,
            ...(birthDate ? { birthDate } : {}),
            ...(city ? { city } : {}),
            ...(phone ? { phone } : {}),
            ...(locationId ? { locationId } : {}),
            status: targetStatus,
            source: "IMPORT",
            // Bei KUNDE/EHEMALIGER pragmatische Defaults für Membership-Dates.
            // signupAt nicht setzen — das ist Anmeldeformular-Sache.
            ...(targetStatus === "KUNDE" ? { memberSince: new Date() } : {}),
            ...(targetStatus === "EHEMALIGER" ? { memberUntil: new Date() } : {}),
          },
        });
        await db.contactEvent.create({
          data: {
            contactId: newContact.id,
            type: "IMPORTED_CREATED",
            meta: { targetStatus, rowNum },
          },
        });
        created++;
      }
    } catch (err) {
      console.error("[import] row failed", rowNum, err);
      errors.push({
        row: rowNum,
        email,
        reason: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
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
