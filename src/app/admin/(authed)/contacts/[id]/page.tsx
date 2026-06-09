import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStudioId } from "@/lib/tenant";
import { ContactDetailActions } from "./ContactDetailActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

const GENDER_LABELS: Record<string, string> = {
  MAENNLICH: "Männlich",
  WEIBLICH: "Weiblich",
  DIVERS: "Divers",
};

const STATUS_LABELS: Record<string, string> = {
  INTERESSENT: "Interessent",
  NEUKUNDE: "Neukunde",
  KUNDE: "Mitglied",
  EHEMALIGER: "Ehemalig",
};

const SOURCE_LABELS: Record<string, string> = {
  LANDING: "Landing-Page",
  DIRECT: "Direkt",
  MANUAL: "Manuell angelegt",
  IMPORT: "Import",
  CLUB_OFFLINE: "Club-Anmeldung (vor Ort)",
  CLUB_ONLINE: "Club-Anmeldung (online)",
};

type TimelineKind =
  | "LEAD"
  | "DOI"
  | "SIGNUP_ONLINE"
  | "SIGNUP_CLUB"
  | "FUNNEL_MAIL"
  | "NEWSLETTER";

const TIMELINE_ICONS: Record<TimelineKind, string> = {
  LEAD: "📥",
  DOI: "✓",
  SIGNUP_ONLINE: "🎉",
  SIGNUP_CLUB: "🏠",
  FUNNEL_MAIL: "📧",
  NEWSLETTER: "📨",
};

export default async function ContactDetail({ params }: PageProps) {
  const { id } = await params;
  const studioId = await requireStudioId();

  const [contact, campaignEvents, allLists] = await Promise.all([
    db.contact.findFirst({
      where: { id, studioId },
      include: {
        pricingPlan: true,
        location: true,
        lists: { include: { list: true } },
        events: { orderBy: { createdAt: "desc" }, take: 30 },
        funnelEnrollments: {
          include: {
            funnel: {
              select: {
                id: true,
                name: true,
                trigger: true,
                steps: {
                  select: { id: true, orderNum: true, subject: true, delayDays: true },
                  orderBy: { orderNum: "asc" },
                },
              },
            },
            events: {
              include: { step: { select: { orderNum: true, subject: true } } },
              orderBy: { sentAt: "desc" },
            },
          },
          orderBy: { startedAt: "desc" },
        },
      },
    }),
    db.campaignEvent.findMany({
      where: { contactId: id, event: "SENT" },
      include: { campaign: { select: { subject: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.list.findMany({ where: { studioId }, orderBy: { name: "asc" } }),
  ]);

  if (!contact) notFound();

  const fullName =
    contact.firstName || contact.lastName
      ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()
      : contact.email;

  // ─── TIMELINE BAUEN ───────────────────────────────────────
  type TimelineItem = {
    id: string;
    at: Date;
    kind: TimelineKind;
    title: string;
    subtitle?: string;
  };

  const timeline: TimelineItem[] = [];

  // 1. Lead-Eintragung
  timeline.push({
    id: `lead-${contact.id}`,
    at: contact.createdAt,
    kind: "LEAD",
    title: "Hat sich eingetragen",
    subtitle: SOURCE_LABELS[contact.source] ?? contact.source,
  });

  // 2. DOI bestätigt
  if (contact.doiConfirmedAt) {
    timeline.push({
      id: `doi-${contact.id}`,
      at: contact.doiConfirmedAt,
      kind: "DOI",
      title: "E-Mail bestätigt",
      subtitle: "Tarife-Mail wurde anschließend automatisch versendet",
    });
  }

  // 3. Anmeldung (online oder club)
  if (contact.signupAt) {
    const isClub = contact.source === "CLUB_OFFLINE" || contact.source === "CLUB_ONLINE";
    const subParts: string[] = [];
    if (contact.pricingPlan?.name) subParts.push(`Tarif: ${contact.pricingPlan.name}`);
    if (contact.signupStaff) subParts.push(`angelegt von ${contact.signupStaff}`);
    timeline.push({
      id: `signup-${contact.id}`,
      at: contact.signupAt,
      kind: isClub ? "SIGNUP_CLUB" : "SIGNUP_ONLINE",
      title: isClub ? "Im Club als Mitglied angemeldet" : "Hat sich online angemeldet",
      subtitle: subParts.join(" · ") || undefined,
    });
  }

  // 4. Funnel-Mails
  for (const enrollment of contact.funnelEnrollments) {
    for (const event of enrollment.events) {
      timeline.push({
        id: `funnel-${event.id}`,
        at: event.sentAt,
        kind: "FUNNEL_MAIL",
        title: `Funnel-Mail: „${event.step.subject}"`,
        subtitle: `${enrollment.funnel.name} · Schritt ${event.step.orderNum}`,
      });
    }
  }

  // 5. Newsletter-Mails
  for (const ce of campaignEvents) {
    timeline.push({
      id: `newsletter-${ce.id}`,
      at: ce.createdAt,
      kind: "NEWSLETTER",
      title: `Newsletter: „${ce.campaign.subject}"`,
    });
  }

  timeline.sort((a, b) => b.at.getTime() - a.at.getTime());

  // ─── Was steht als nächstes an? ───────────────────────────
  type Upcoming = {
    enrollmentId: string;
    funnelName: string;
    funnelId: string;
    stepOrderNum: number;
    stepSubject: string;
  };
  const upcoming: Upcoming[] = [];

  for (const enrollment of contact.funnelEnrollments) {
    if (enrollment.completedAt || enrollment.cancelledAt) continue;
    const sentStepIds = new Set(enrollment.events.map((e) => e.stepId));
    const nextStep = enrollment.funnel.steps.find((s) => !sentStepIds.has(s.id));
    if (nextStep) {
      upcoming.push({
        enrollmentId: enrollment.id,
        funnelName: enrollment.funnel.name,
        funnelId: enrollment.funnel.id,
        stepOrderNum: nextStep.orderNum,
        stepSubject: nextStep.subject,
      });
    }
  }

  // ─── ZÄHLEN für Headline ─────────────────────────────────
  const totalFunnelMails = contact.funnelEnrollments.reduce(
    (sum, e) => sum + e.events.length,
    0,
  );
  const totalNewsletters = campaignEvents.length;
  const totalMails = totalFunnelMails + totalNewsletters + (contact.doiConfirmedAt ? 1 : 0);

  return (
    <div className="p-4 md:p-8 lg:p-12">
      {/* Top-Bar: Zurück-Link + Drucken-Button rechts */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/contacts"
          className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
        >
          ← Zurück zu Kontakten
        </Link>

        <Link
          href={`/admin/contacts/${contact.id}/vertrag`}
          className="inline-flex items-center gap-2 rounded-md border border-ink/20 bg-white px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:border-ink/40 hover:bg-ink/5"
        >
          <span aria-hidden>🖨</span>
          <span>Drucken</span>
        </Link>
      </div>

      <div className="mt-6 mb-8 md:mb-12">
        <div className="flex flex-wrap items-baseline gap-3">
          <p className="label">Kontakt</p>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-acid_dark">
            {STATUS_LABELS[contact.status] ?? contact.status}
          </span>
        </div>
        <h1 className="mt-2 text-display text-3xl md:text-4xl">{fullName}</h1>
        <p className="mt-2 font-mono text-sm text-muted break-all">{contact.email}</p>
        {totalMails > 0 && (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {totalMails} {totalMails === 1 ? "Mail" : "Mails"} insgesamt rausgegangen ·{" "}
            {timeline.length} Aktivitäten
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 md:gap-12 lg:grid-cols-3">
        <div className="space-y-8 md:space-y-12 lg:col-span-2">
          {/* ─── TIMELINE ─── */}
          <section>
            <p className="label mb-4">Verlauf · Stand der Dinge</p>
            <ol className="relative border-l-2 border-ink/15 pl-6 space-y-6">
              {timeline.map((item) => (
                <li key={item.id} className="relative">
                  <span className="absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full bg-cream border-2 border-ink/15 text-xs">
                    {TIMELINE_ICONS[item.kind]}
                  </span>
                  <div>
                    <p className="text-sm leading-snug">{item.title}</p>
                    {item.subtitle && (
                      <p className="mt-0.5 text-xs text-muted">{item.subtitle}</p>
                    )}
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      {item.at.toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ─── WAS STEHT AN? ─── */}
          {upcoming.length > 0 && (
            <section>
              <p className="label mb-4">Was als Nächstes ansteht</p>
              <div className="border border-ink/15 divide-y divide-ink/10">
                {upcoming.map((u) => (
                  <div key={u.enrollmentId} className="p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                      Funnel-Mail · automatisch
                    </p>
                    <p className="mt-2 text-base">„{u.stepSubject}"</p>
                    <p className="mt-1 text-xs text-muted">
                      <Link href={`/admin/funnels/${u.funnelId}`} className="hover:underline">
                        {u.funnelName}
                      </Link>{" "}
                      · Schritt {u.stepOrderNum}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── STAMMDATEN ─── */}
          <section>
            <p className="label mb-4">Stammdaten</p>
            <div className="border border-ink/15">
              <DataRow k="E-Mail" v={contact.email} />
              <DataRow k="Vorname" v={contact.firstName ?? "—"} />
              <DataRow k="Nachname" v={contact.lastName ?? "—"} />
              <DataRow
                k="Geschlecht"
                v={contact.gender ? GENDER_LABELS[contact.gender] ?? "—" : "—"}
              />
              <DataRow k="Standort" v={contact.location?.name ?? "—"} />
              <DataRow k="Telefon" v={contact.phone ?? "—"} />
              <DataRow
                k="Geburtsdatum"
                v={contact.birthDate ? contact.birthDate.toLocaleDateString("de-DE") : "—"}
              />
              <DataRow
                k="Adresse"
                v={
                  contact.street
                    ? `${contact.street}, ${contact.postalCode ?? ""} ${contact.city ?? ""}`.trim()
                    : "—"
                }
              />
              <DataRow k="Quelle" v={SOURCE_LABELS[contact.source] ?? contact.source} />
              {contact.signupStaff && <DataRow k="Angelegt von" v={contact.signupStaff} />}
              <DataRow k="DOI bestätigt" v={contact.doiConfirmedAt ? "Ja" : "Nein"} />
            </div>
          </section>

          {/* ─── VERTRAGSDATEN ─── */}
          <section>
            <p className="label mb-4">Vertrag &amp; Bankdaten</p>
            <div className="border border-ink/15">
              <DataRow k="Tarif" v={contact.pricingPlan?.name ?? "—"} />
              <DataRow k="IBAN" v={contact.iban ?? "—"} mono />
              <DataRow
                k="Vertragsstart"
                v={
                  contact.contractStartDate
                    ? contact.contractStartDate.toLocaleDateString("de-DE")
                    : "—"
                }
              />
              <DataRow
                k="Anmeldung am"
                v={contact.signupAt ? contact.signupAt.toLocaleString("de-DE") : "—"}
              />
              <DataRow
                k="Mitglied seit"
                v={contact.memberSince ? contact.memberSince.toLocaleDateString("de-DE") : "—"}
              />
              <DataRow
                k="Mitglied bis"
                v={contact.memberUntil ? contact.memberUntil.toLocaleDateString("de-DE") : "—"}
              />
            </div>
          </section>

          {/* ─── ALLE MAILS DETAILLIERT ─── */}
          {(totalFunnelMails > 0 || totalNewsletters > 0) && (
            <section>
              <p className="label mb-4">Alle versendeten Mails</p>
              <div className="border border-ink/15 divide-y divide-ink/10">
                {contact.funnelEnrollments.flatMap((enrollment) =>
                  enrollment.events.map((event) => (
                    <div key={event.id} className="p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                        Funnel · {enrollment.funnel.name}
                      </p>
                      <p className="mt-1 text-sm">{event.step.subject}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted">
                        {event.sentAt.toLocaleString("de-DE")} · Schritt {event.step.orderNum}
                      </p>
                    </div>
                  )),
                )}
                {campaignEvents.map((ce) => (
                  <div key={ce.id} className="p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                      Newsletter
                    </p>
                    <p className="mt-1 text-sm">{ce.campaign.subject}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted">
                      {ce.createdAt.toLocaleString("de-DE")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div>
          <ContactDetailActions
            contact={{
              id: contact.id,
              status: contact.status,
              notes: contact.notes,
            }}
            lists={allLists.map((l) => ({ id: l.id, name: l.name }))}
            assignedListIds={contact.lists.map((cl) => cl.list.id)}
          />
        </div>
      </div>
    </div>
  );
}

function DataRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 border-b border-ink/10 last:border-b-0">
      <p className="bg-ink/5 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted md:px-4 md:text-[11px]">
        {k}
      </p>
      <p
        className={`col-span-2 px-3 py-3 text-sm break-words md:px-4 ${mono ? "font-mono" : ""}`}
      >
        {v}
      </p>
    </div>
  );
}
