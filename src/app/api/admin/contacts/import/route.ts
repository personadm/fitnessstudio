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
}

interface RequestBody {
  rows: IncomingRow[];
  targetStatus: string;
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
        } = {};

        if (strategy === "update_status") {
          updateData.status = targetStatus;
        } else if (strategy === "update_all") {
          updateData.status = targetStatus;
          if (firstName) updateData.firstName = firstName;
          if (lastName) updateData.lastName = lastName;
          if (gender) updateData.gender = gender;
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
        // Neu anlegen
        const newContact = await db.contact.create({
          data: {
            email,
            firstName,
            lastName,
            gender,
            status: targetStatus,
            source: "IMPORT",
            // Bei NEUKUNDE oder KUNDE setzen wir signupAt nicht — das
            // ist nur fürs neue Anmelde-Formular. Hier kommen historische
            // Daten rein.
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
