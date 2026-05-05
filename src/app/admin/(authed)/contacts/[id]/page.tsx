import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ContactDetailActions } from "./ContactDetailActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetail({ params }: PageProps) {
  const { id } = await params;
  const contact = await db.contact.findUnique({
    where: { id },
    include: {
      pricingPlan: true,
      lists: { include: { list: true } },
      events: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!contact) notFound();

  const allLists = await db.list.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="p-8 md:p-12">
      <Link href="/admin/contacts" className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink">
        ← Zurück zu Kontakten
      </Link>

      <div className="mt-6 mb-12">
        <p className="label">Kontakt</p>
        <h1 className="mt-2 text-display text-4xl">
          {contact.firstName || contact.lastName
            ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()
            : contact.email}
        </h1>
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
              <DataRow k="Telefon" v={contact.phone ?? "—"} />
              <DataRow k="Geburtsdatum" v={contact.birthDate ? contact.birthDate.toLocaleDateString("de-DE") : "—"} />
              <DataRow k="Adresse" v={contact.street ? `${contact.street}, ${contact.postalCode} ${contact.city}` : "—"} />
              <DataRow k="Tarif" v={contact.pricingPlan?.name ?? "—"} />
              <DataRow k="Mitglied seit" v={contact.memberSince ? contact.memberSince.toLocaleDateString("de-DE") : "—"} />
              <DataRow k="Mitglied bis" v={contact.memberUntil ? contact.memberUntil.toLocaleDateString("de-DE") : "—"} />
              <DataRow k="Quelle" v={contact.source} />
              <DataRow k="DOI bestätigt" v={contact.doiConfirmedAt ? "Ja" : "Nein"} />
            </div>
          </section>

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
                      <p className="mt-1 text-xs text-muted">{e.createdAt.toLocaleString("de-DE")}</p>
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

function DataRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-3 border-b border-ink/10 last:border-b-0">
      <p className="bg-ink/5 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{k}</p>
      <p className="col-span-2 px-4 py-3 text-sm">{v}</p>
    </div>
  );
}
