import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCurrentStudioId } from "@/lib/tenant";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Such-Endpoint für Kontakte (für AddContactPanel in Listen-Verwaltung).
 *
 * Query-Parameter:
 *  - q: Such-String (mindestens 2 Zeichen) — sucht in email, firstName, lastName
 *  - listId (optional): wenn gesetzt, wird pro Treffer geprüft ob der Kontakt
 *    schon in der Liste ist (Feld `alreadyInList`)
 *
 * Max 50 Ergebnisse — höher als die bisherigen 20, damit Multi-Select
 * mit "alle markieren" auf einen Schlag nutzbar ist.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const studioId = await getCurrentStudioId();
  if (!studioId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const listId = searchParams.get("listId");

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const contacts = await db.contact.findMany({
    where: {
      studioId,
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { email: "asc" }],
    take: 50,
  });

  let inListIds = new Set<string>();
  if (listId && contacts.length > 0) {
    const existing = await db.contactList.findMany({
      where: {
        listId,
        contactId: { in: contacts.map((c) => c.id) },
      },
      select: { contactId: true },
    });
    inListIds = new Set(existing.map((e) => e.contactId));
  }

  return NextResponse.json({
    results: contacts.map((c) => ({
      ...c,
      alreadyInList: inListIds.has(c.id),
    })),
  });
}
