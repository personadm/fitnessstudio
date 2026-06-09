import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStudioId } from "@/lib/tenant";
import { removeContactFromList } from "@/app/admin/_actions";
import { AddContactPanel } from "./AddContactPanel";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ListDetailPage({ params }: PageProps) {
  const { id } = await params;
  const studioId = await requireStudioId();

  const [list, locations] = await Promise.all([
    db.list.findFirst({
      where: { id, studioId },
      include: {
        contacts: {
          include: {
            contact: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                status: true,
              },
            },
          },
          orderBy: { addedAt: "desc" },
        },
      },
    }),
    db.location.findMany({
      where: { studioId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  if (!list) notFound();

  return (
    <div className="p-8 md:p-12 max-w-4xl">
      <Link
        href="/admin/lists"
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
      >
        ← Zurück zu Listen
      </Link>

      <div className="mt-6 mb-12">
        <p className="label">Liste</p>
        <h1 className="mt-2 text-display text-5xl">{list.name}</h1>
        {list.description && (
          <p className="mt-3 max-w-2xl text-sm text-muted leading-relaxed">
            {list.description}
          </p>
        )}
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          {list.contacts.length}{" "}
          {list.contacts.length === 1 ? "Mitglied" : "Mitglieder"}
        </p>
      </div>

      {/* Personen hinzufügen */}
      <section className="mb-12">
        <p className="label mb-3">Personen hinzufügen</p>
        <AddContactPanel listId={list.id} locations={locations} />
      </section>

      {/* Mitglieder */}
      <section>
        <p className="label mb-4">Mitglieder</p>
        {list.contacts.length === 0 ? (
          <div className="border border-ink/15 p-12 text-center">
            <p className="text-sm text-muted">
              Diese Liste ist noch leer. Füge oben Personen hinzu.
            </p>
          </div>
        ) : (
          <div className="border border-ink/15 divide-y divide-ink/10">
            {list.contacts.map(({ contact, addedAt }) => {
              const name =
                contact.firstName || contact.lastName
                  ? `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim()
                  : "—";
              return (
                <div
                  key={contact.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-ink/5"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/contacts/${contact.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {name}
                    </Link>
                    <p className="mt-0.5 font-mono text-[11px] text-muted">
                      {contact.email} · {contact.status} · seit{" "}
                      {new Date(addedAt).toLocaleDateString("de-DE")}
                    </p>
                  </div>
                  <form
                    action={removeContactFromList.bind(null, contact.id, list.id)}
                  >
                    <button
                      type="submit"
                      className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted hover:text-red-700"
                    >
                      Entfernen
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
