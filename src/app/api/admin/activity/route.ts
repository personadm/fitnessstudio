import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export type ActivityKind =
  | "LEAD"
  | "DOI_CONFIRMED"
  | "SIGNUP_ONLINE"
  | "SIGNUP_CLUB"
  | "FUNNEL_MAIL"
  | "CAMPAIGN_MAIL";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  at: string;
  title: string;
  subtitle?: string;
  contactId?: string;
  href?: string;
};

/**
 * Live-Activity für das Admin-Dashboard.
 *
 * Schema-Hinweise:
 *  - CampaignEvent hat KEIN `sentAt` und KEINE direkte `contact`-Relation —
 *    Zeitstempel ist `createdAt`, Verbindung zu Contact über `contactId`.
 *    Wir filtern zusätzlich auf event = "SENT", damit Bounces/Opens/Clicks
 *    nicht in der Activity erscheinen.
 *  - FunnelStepEvent hat `sentAt` und kommt über `enrollment.contact`.
 *  - Contact-Daten der CampaignEvents werden in einer zweiten Query geholt
 *    und über eine Map verknüpft (keine Relation im Schema).
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Letzte 14 Tage
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [contacts, funnelEvents, campaignEvents] = await Promise.all([
    db.contact.findMany({
      where: {
        OR: [
          { createdAt: { gte: since } },
          { doiConfirmedAt: { gte: since } },
          { signupAt: { gte: since } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        source: true,
        signupStaff: true,
        createdAt: true,
        doiConfirmedAt: true,
        signupAt: true,
        pricingPlan: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.funnelStepEvent.findMany({
      where: { sentAt: { gte: since } },
      select: {
        id: true,
        sentAt: true,
        step: {
          select: {
            orderNum: true,
            funnel: { select: { name: true } },
          },
        },
        enrollment: {
          select: {
            contact: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: { sentAt: "desc" },
      take: 50,
    }),
    db.campaignEvent.findMany({
      where: {
        event: "SENT",
        createdAt: { gte: since },
      },
      select: {
        id: true,
        contactId: true,
        createdAt: true,
        campaign: { select: { subject: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  // Contacts für CampaignEvents in einer Sammel-Query holen (keine Relation im Schema)
  const campaignContactIds = Array.from(new Set(campaignEvents.map((c) => c.contactId)));
  const campaignContacts = campaignContactIds.length
    ? await db.contact.findMany({
        where: { id: { in: campaignContactIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : [];
  const contactMap = new Map(campaignContacts.map((c) => [c.id, c]));

  const items: ActivityItem[] = [];
  const displayName = (c: { firstName: string | null; lastName: string | null; email: string }) =>
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || c.email;

  for (const c of contacts) {
    const name = displayName(c);
    const href = `/admin/contacts/${c.id}`;

    items.push({
      id: `lead-${c.id}`,
      kind: "LEAD",
      at: c.createdAt.toISOString(),
      title: `${name} hat sich für die Angebotszusendung eingetragen`,
      subtitle: c.email,
      contactId: c.id,
      href,
    });

    if (c.doiConfirmedAt) {
      items.push({
        id: `doi-${c.id}`,
        kind: "DOI_CONFIRMED",
        at: c.doiConfirmedAt.toISOString(),
        title: `${name} hat die E-Mail bestätigt`,
        subtitle: "Tarife-Mail ging raus",
        contactId: c.id,
        href,
      });
    }

    if (c.signupAt) {
      const isClub = c.source === "CLUB_OFFLINE" || c.source === "CLUB_ONLINE";
      const planLabel = c.pricingPlan?.name ? `Tarif: ${c.pricingPlan.name}` : "";
      const staffLabel = c.signupStaff ? `· angelegt von ${c.signupStaff}` : "";

      items.push({
        id: `signup-${c.id}`,
        kind: isClub ? "SIGNUP_CLUB" : "SIGNUP_ONLINE",
        at: c.signupAt.toISOString(),
        title: isClub
          ? `${name} im Club angemeldet`
          : `${name} hat sich online angemeldet`,
        subtitle: [planLabel, staffLabel].filter(Boolean).join(" "),
        contactId: c.id,
        href,
      });
    }
  }

  for (const fe of funnelEvents) {
    const c = fe.enrollment.contact;
    items.push({
      id: `funnel-${fe.id}`,
      kind: "FUNNEL_MAIL",
      at: fe.sentAt.toISOString(),
      title: `Funnel-Mail #${fe.step.orderNum} an ${displayName(c)}`,
      subtitle: fe.step.funnel.name,
      contactId: c.id,
      href: `/admin/contacts/${c.id}`,
    });
  }

  for (const ce of campaignEvents) {
    const contact = contactMap.get(ce.contactId);
    if (!contact) continue;
    items.push({
      id: `campaign-${ce.id}`,
      kind: "CAMPAIGN_MAIL",
      at: ce.createdAt.toISOString(),
      title: `Newsletter an ${displayName(contact)}`,
      subtitle: ce.campaign.subject,
      contactId: contact.id,
      href: `/admin/contacts/${contact.id}`,
    });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : -1));

  return NextResponse.json({ items: items.slice(0, 80) });
}
