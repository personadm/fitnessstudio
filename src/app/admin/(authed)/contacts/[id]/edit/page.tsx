import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CONTACT_EDIT_SELECT, toContactFormValues } from "@/lib/contact-edit";
import { ContactEditForm } from "./ContactEditForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactEditPage({ params }: PageProps) {
  const { id } = await params;

  const [contact, locations, plans] = await Promise.all([
    db.contact.findFirst({
      where: { id },
      select: { id: true, doiConfirmedAt: true, ...CONTACT_EDIT_SELECT },
    }),
    db.location.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, city: true, active: true },
    }),
    db.pricingPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, active: true, location: { select: { name: true } } },
    }),
  ]);

  if (!contact) notFound();

  const fullName =
    contact.firstName || contact.lastName
      ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()
      : contact.email;

  return (
    <div className="p-4 md:p-8 lg:p-12">
      <Link
        href={`/admin/contacts/${contact.id}`}
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
      >
        ← Zurück zum Kontakt
      </Link>

      <div className="mt-6 mb-8 md:mb-12">
        <p className="label">Kontakt bearbeiten</p>
        <h1 className="mt-2 text-display text-3xl md:text-4xl">{fullName}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Stamm- und Vertragsdaten korrigieren. Beim Speichern werden keine Mails
          verschickt und der Status bleibt unverändert — den änderst du wie gewohnt
          auf der Kontaktseite.
        </p>
      </div>

      <ContactEditForm
        contactId={contact.id}
        isDoiConfirmed={!!contact.doiConfirmedAt}
        initial={toContactFormValues(contact)}
        locations={locations.map((l) => ({
          id: l.id,
          label: `${l.name}${l.city ? ` · ${l.city}` : ""}${l.active ? "" : " (inaktiv)"}`,
        }))}
        plans={plans.map((p) => ({
          id: p.id,
          label: `${p.name}${p.location ? ` · ${p.location.name}` : ""}${p.active ? "" : " (inaktiv)"}`,
        }))}
      />
    </div>
  );
}
