import { db } from "@/lib/db";
import { createList, deleteList } from "@/app/admin/_actions";

export default async function ListsPage() {
  const lists = await db.list.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { contacts: true } } },
  });

  return (
    <div className="p-8 md:p-12">
      <p className="label">Listen</p>
      <h1 className="mt-2 text-display text-4xl mb-12">Newsletter-Listen</h1>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="border border-ink/15">
            {lists.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted">Noch keine Listen.</p>
            ) : (
              <ul className="divide-y divide-ink/15">
                {lists.map((l) => (
                  <li key={l.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{l.name}</p>
                      {l.description && <p className="text-xs text-muted">{l.description}</p>}
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                        {l._count.contacts} Empfänger
                      </p>
                    </div>
                    <form action={deleteList.bind(null, l.id)}>
                      <button className="font-mono text-xs text-red-700 underline underline-offset-2">
                        Löschen
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <p className="label mb-3">Neue Liste</p>
          <form action={createList} className="space-y-4">
            <input
              name="name"
              required
              placeholder="Listen-Name"
              className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
            />
            <input
              name="description"
              placeholder="Beschreibung (optional)"
              className="w-full border-b-2 border-ink/30 bg-transparent py-2 text-sm outline-none focus:border-ink"
            />
            <button
              type="submit"
              className="w-full bg-ink py-2 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
            >
              Anlegen
            </button>
          </form>
          <p className="mt-4 text-xs text-muted">
            Tipp: Kontakte können einer Liste auf der jeweiligen Detail-Seite hinzugefügt werden.
          </p>
        </div>
      </div>
    </div>
  );
}
