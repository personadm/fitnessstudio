import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ContactDetailActions } from "./ContactDetailActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

const GENDER_LABELS: Record<string, string> = {
  MAENNLICH: "Männlich",
  WEIBLICH: "Weiblich",
  DIVERS: "Divers",
};

export default async function ContactDetail({ params }: PageProps) {
  const { id } = await params;
  const contact = await db.contact.findUnique({
    where: { id },
    include: {
      pricingPlan: true,
      location: true,
      lists: { include: { list: true } },
      events: { orderBy: { createdAt: "desc" }, take: 30 },
      funnelEnrollments: {
        include: {
          funnel: { select: { id: true, name: true, trigger: true } },
          events: { include: { step: { select: { orderNum: true, subject: true } } } },
        },
        orderBy: { startedAt: "desc" },
      },
    },
  });
  if (!contact) notFound();

  const allLists = await db.list.findMany({ orderBy: { name: "asc" } });

  const fullName =
    contact.firstName || contact.lastName
      ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()
      : contact.email;

  return (
    <div className="p-8 md:p-12">
      <Link
        href="/admin/contacts"
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
      >
        ← Zurück zu Kontakten
      </Link>

      <div className="mt-6 mb-12">
        <p className="label">Kontakt</p>
        <h1 className="mt-2 text-display text-4xl">{fullName}</h1>
        <p className="mt-2 font-mono text-sm text-muted">{contact.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
        <div className="md:col-span-2 space-y-12">
          {/* Stammdaten */}
          <section>
            <p className="label mb-4">Stammdaten</p>
            <div className="border border-ink/15">
              <DataRow k="E-Mail" v={contact.email} />
              <DataRow k="Vorname" v={contact.firstName ?? "—"} />
              <DataRow k="Nachname" v={contact.lastName ?? "—"} />
              <DataRow k="Geschlecht" v={contact.gender ? GENDER_LABELS[contact.gender] : "—"} />
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
              <DataRow k="Quelle" v={contact.source} />
              <DataRow k="DOI bestätigt" v={contact.doiConfirmedAt ? "Ja" : "Nein"} />
            </div>
          </section>

          {/* Vertragsdaten */}
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

          {/* Funnel-Enrollments */}
          {contact.funnelEnrollments.length > 0 && (
            <section>
              <p className="label mb-4">Funnels</p>
              <div className="border border-ink/15 divide-y divide-ink/10">
                {contact.funnelEnrollments.map((e) => {
                  const status = e.completedAt
                    ? `Abgeschlossen (${e.completedAt.toLocaleDateString("de-DE")})`
                    : e.cancelledAt
                    ? `Abgebrochen (${e.cancelledAt.toLocaleDateString("de-DE")}) – ${
                        e.cancelReason ?? ""
                      }`
                    : "Aktiv";
                  return (
                    <div key={e.id} className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <Link
                          href={`/admin/funnels/${e.funnel.id}`}
                          className="text-sm hover:underline"
                        >
                          {e.funnel.name}
                        </Link>
                        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                          {status}
                        </p>
                      </div>
                      {e.events.length > 0 && (
                        <p className="mt-1 font-mono text-[11px] text-muted">
                          {e.events.length} {e.events.length === 1 ? "Schritt" : "Schritte"}{" "}
                          versendet
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Aktivitäts-Log */}
          <section>
            <p className="label mb-4">Aktivitäten</p>
            <div className="border border-ink/15">
              {contact.events.length === 0 ? (
                <p className="p-4 text-sm text-muted">Noch keine Events.</p>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {contact.events.map((e) => (
                    <li key={e.id} className="p-4 text-sm">
                      <p className="font-mono text-xs uppercase tracking-[0.1em]">{e.type}</p>
                      <p className="mt-1 text-xs text-muted">
                        {e.createdAt.toLocaleString("de-DE")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
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
      <p className="bg-ink/5 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
        {k}
      </p>
      <p className={`col-span-2 px-4 py-3 text-sm ${mono ? "font-mono" : ""}`}>{v}</p>
    </div>
  );
}
