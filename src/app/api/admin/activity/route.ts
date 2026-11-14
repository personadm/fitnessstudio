import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { CONTACT_EVENT } from "@/lib/contact-events";

export type ActivityKind =
  | "LEAD"
  | "NEWSLETTER"
  | "DOI_CONFIRMED"
  | "SIGNUP_ONLINE"
  | "SIGNUP_CLUB"
  | "FUNNEL_MAIL"
  | "CAMPAIGN_MAIL";

// Kontakte, deren createdAt so nah an signupAt liegt, sind beim Absenden der
// Anmeldung angelegt worden (signupAt wird im Code gesetzt, createdAt von der
// DB beim Insert — wenige Millisekunden Abstand).
const CREATED_BY_SIGNUP_WINDOW_MS = 60_000;

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
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Letzte 14 Tage
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [contacts, signupContacts, upgradeEvents, funnelEvents, campaignEvents] = await Promise.all([
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
        sourceChannel: true,
        newsletterOnly: true,
        createdAt: true,
        doiConfirmedAt: true,
        signupAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    // Anmeldungen separat nach signupAt: Die Kontakt-Query oben sortiert nach
    // createdAt und schneidet bei 200 ab — ein älterer Bestandskontakt, der
    // sich jetzt anmeldet, fiel dort heraus, sobald in 14 Tagen mehr als 200
    // Kontakte neu dazukamen (z. B. Newsletter-Eintragungen). Außerdem gilt
    // eine Anmeldung auch dann, wenn der Kontakt vorher Nur-Newsletter war.
    db.contact.findMany({
      where: { signupAt: { gte: since } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        source: true,
        signupStaff: true,
        signupAt: true,
        pricingPlan: { select: { name: true } },
      },
      orderBy: { signupAt: "desc" },
      take: 80,
    }),
    // Aufstiege vom Nur-Newsletter-Kontakt (Gratis-Start-Plan angefordert bzw.
    // angemeldet). Liefern den Zeitpunkt der Plan-Anforderung — createdAt ist
    // bei diesen Kontakten die Newsletter-Eintragung.
    db.contactEvent.findMany({
      where: {
        type: { in: [CONTACT_EVENT.NEWSLETTER_TO_LEAD, CONTACT_EVENT.NEWSLETTER_TO_SIGNUP] },
        createdAt: { gte: since },
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, sourceChannel: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.funnelStepEvent.findMany({
      // skipped: false → nur echte Sends im Feed, keine Skip-Marker
      where: { sentAt: { gte: since }, skipped: false },
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

  const upgradedIds = new Set(upgradeEvents.map((e) => e.contact.id));
  const leadUpgradeIds = new Set(
    upgradeEvents
      .filter((e) => e.type === CONTACT_EVENT.NEWSLETTER_TO_LEAD)
      .map((e) => e.contact.id),
  );

  for (const c of contacts) {
    const name = displayName(c);
    const href = `/admin/contacts/${c.id}`;
    const newsletterItem: ActivityItem = {
      id: `newsletter-${c.id}`,
      kind: "NEWSLETTER",
      at: c.createdAt.toISOString(),
      title: `${name} hat sich für den Newsletter eingetragen`,
      subtitle: c.email,
      contactId: c.id,
      href,
    };

    // Nur-Newsletter-Abonnenten erscheinen mit eigenem Eintrag ("hat sich für
    // den Newsletter eingetragen") — NICHT als Lead/Angebot. Sie zählen bewusst
    // nicht in die Sales-Statistik, sollen aber im Live-Feed sichtbar sein.
    if (c.newsletterOnly) {
      items.push(newsletterItem);
      continue;
    }

    // Vom Newsletter aufgestiegen: createdAt bleibt die Newsletter-Eintragung.
    // Die Plan-Anforderung kommt als eigener Eintrag aus dem Aufstiegs-Event
    // (unten); „Plan verschickt" nur, wenn der Plan auch angefordert wurde —
    // sonst ist doiConfirmedAt noch die Newsletter-Bestätigung.
    if (c.source === "NEWSLETTER" || upgradedIds.has(c.id)) {
      if (c.createdAt >= since) items.push(newsletterItem);
      if (c.doiConfirmedAt && leadUpgradeIds.has(c.id)) {
        items.push({
          id: `doi-${c.id}`,
          kind: "DOI_CONFIRMED",
          at: c.doiConfirmedAt.toISOString(),
          title: `${name} – Gratis-Start-Plan verschickt`,
          subtitle: "Plan-Mail ging raus",
          contactId: c.id,
          href,
        });
      }
      continue;
    }

    // Kontakt ist erst durch die Anmeldung selbst entstanden (direkt auf
    // /anmelden bzw. im Club, ohne vorherigen Gratis-Start-Plan): kein
    // „Gratis-Start-Plan"-Eintrag — sonst stünde dieser Millisekunden nach
    // der Anmeldung über ihr in der Liste. Die Anmeldung selbst kommt unten.
    const createdBySignup =
      c.signupAt !== null &&
      Math.abs(c.createdAt.getTime() - c.signupAt.getTime()) < CREATED_BY_SIGNUP_WINDOW_MS;
    if (createdBySignup) continue;

    items.push({
      id: `lead-${c.id}`,
      kind: "LEAD",
      at: c.createdAt.toISOString(),
      title: `${name} hat sich für den Gratis-Start-Plan eingetragen`,
      // Herkunftskanal (Klartext) zusätzlich zur E-Mail anzeigen, sofern bekannt.
      subtitle: [c.sourceChannel, c.email].filter(Boolean).join(" · "),
      contactId: c.id,
      href,
    });

    if (c.doiConfirmedAt) {
      items.push({
        id: `doi-${c.id}`,
        kind: "DOI_CONFIRMED",
        at: c.doiConfirmedAt.toISOString(),
        title: `${name} – Gratis-Start-Plan verschickt`,
        subtitle: "Plan-Mail ging raus",
        contactId: c.id,
        href,
      });
    }
  }

  for (const e of upgradeEvents) {
    if (e.type !== CONTACT_EVENT.NEWSLETTER_TO_LEAD) continue;
    const c = e.contact;
    items.push({
      id: `lead-upgrade-${e.id}`,
      kind: "LEAD",
      at: e.createdAt.toISOString(),
      title: `${displayName(c)} hat sich für den Gratis-Start-Plan eingetragen`,
      subtitle: [c.sourceChannel, c.email].filter(Boolean).join(" · "),
      contactId: c.id,
      href: `/admin/contacts/${c.id}`,
    });
  }

  for (const c of signupContacts) {
    if (!c.signupAt) continue;
    const name = displayName(c);
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
      href: `/admin/contacts/${c.id}`,
    });
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

  // Neueste zuerst. Gleiche Zeit → 0, damit die (stabile) Sortierung die
  // Einfüge-Reihenfolge behält statt zufällig zu tauschen.
  items.sort((a, b) => (a.at === b.at ? 0 : a.at < b.at ? 1 : -1));

  return NextResponse.json({ items: items.slice(0, 80) });
}
