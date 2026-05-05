import Link from "next/link";
import { db } from "@/lib/db";
import { createCampaign } from "@/app/admin/_actions";

export default async function NewCampaignPage() {
  const lists = await db.list.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { contacts: true } } },
  });

  if (lists.length === 0) {
    return (
      <div className="p-8 md:p-12">
        <Link href="/admin/campaigns" className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink">
          ← Zurück
        </Link>
        <p className="mt-6 max-w-xl text-base">
          Du hast noch keine Listen. Leg unter <Link href="/admin/lists" className="underline">Listen</Link> mindestens eine
          an und füge Kontakte hinzu, bevor du eine Kampagne erstellst.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12">
      <Link href="/admin/campaigns" className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink">
        ← Zurück zu Kampagnen
      </Link>

      <p className="mt-6 label">Newsletter</p>
      <h1 className="mt-2 text-display text-4xl mb-12">Neue Kampagne</h1>

      <form action={createCampaign} className="max-w-3xl space-y-6">
        <label className="block">
          <span className="label mb-2 block">Liste</span>
          <select
            name="listId"
            required
            className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none"
          >
            <option value="">Bitte wählen…</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l._count.contacts} Empfänger)
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label mb-2 block">Betreff</span>
          <input
            type="text"
            name="subject"
            required
            maxLength={150}
            className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
          />
        </label>

        <label className="block">
          <span className="label mb-2 block">Inhalt (HTML, einfach erlaubt: &lt;p&gt;, &lt;a href=...&gt;, &lt;strong&gt;, &lt;br&gt;)</span>
          <textarea
            name="bodyHtml"
            required
            rows={16}
            placeholder="<p>Hallo zusammen,</p>
<p>nächste Woche startet unser neuer HYROX-Kurs! Anmeldung ab heute über den Tresen oder unter <a href='https://...'>diesem Link</a>.</p>
<p>Viele Grüße<br>— Studio Iron</p>"
            className="w-full border border-ink/20 bg-transparent p-3 font-mono text-sm outline-none focus:border-ink"
          />
        </label>

        <p className="text-xs text-muted">
          Die Mail wird automatisch in unser Studio-Layout eingebettet (Header mit Studio-Name, sauberes Styling).
        </p>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="bg-ink px-6 py-2 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
          >
            Als Entwurf speichern
          </button>
          <Link
            href="/admin/campaigns"
            className="border border-ink/20 px-6 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-ink/5"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
