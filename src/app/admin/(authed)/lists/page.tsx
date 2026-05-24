import Link from "next/link";
import { db } from "@/lib/db";
import { createList } from "@/app/admin/_actions";
import { DeleteListButton } from "./DeleteListButton";

export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const lists = await db.list.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { contacts: true } },
    },
  });

  return (
    <div className="p-8 md:p-12 max-w-5xl">
      <div className="mb-12">
        <p className="label">Marketing</p>
        <h1 className="mt-2 text-display text-5xl">Listen</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted leading-relaxed">
          Gruppen von Kontakten für Newsletter-Versand. Eine Liste ist eine
          freie Sammlung — du fügst Personen manuell hinzu oder entfernst sie
          wieder. Listen sind unabhängig vom Status („Kunde", „Ehemaliger" etc).
        </p>
      </div>

      {/* Neue Liste anlegen */}
      <section className="mb-12 border border-ink/15 p-6">
        <p className="label mb-3">Neue Liste anlegen</p>
        <form action={createList} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                Name (Pflicht)
              </span>
              <input
                type="text"
                name="name"
                required
                maxLength={100}
                placeholder="z.B. Sommer-Aktion 2026"
                className="mt-1 w-full border-b border-ink/20 bg-transparent py-2 text-base placeholder:text-muted/60 focus:border-ink focus:outline-none"
              />
            </label>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                Beschreibung (optional)
              </span>
              <input
                type="text"
                name="description"
                maxLength={300}
                placeholder="Wofür diese Liste?"
                className="mt-1 w-full border-b border-ink/20 bg-transparent py-2 text-base placeholder:text-muted/60 focus:border-ink focus:outline-none"
              />
            </label>
          </div>
          <button
            type="submit"
            className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
          >
            + Anlegen
          </button>
        </form>
      </section>

      {/* Alle Listen */}
      <section>
        <p className="label mb-4">Alle Listen ({lists.length})</p>
        {lists.length === 0 ? (
          <div className="border border-ink/15 p-12 text-center">
            <p className="text-sm text-muted">Noch keine Listen angelegt.</p>
          </div>
        ) : (
          <div className="border border-ink/15 divide-y divide-ink/10">
            {lists.map((list) => (
              <div
                key={list.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-ink/5"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/lists/${list.id}`}
                    className="text-base font-medium hover:underline"
                  >
                    {list.name}
                  </Link>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                    {list._count.contacts}{" "}
                    {list._count.contacts === 1 ? "Mitglied" : "Mitglieder"}
                    {list.description && (
                      <>
                        {" · "}
                        <span className="normal-case tracking-normal">{list.description}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/lists/${list.id}`}
                    className="font-mono text-xs uppercase tracking-[0.1em] text-muted hover:text-ink"
                  >
                    Bearbeiten →
                  </Link>
                  <DeleteListButton listId={list.id} listName={list.name} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
