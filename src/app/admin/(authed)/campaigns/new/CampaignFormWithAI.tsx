"use client";

import { useState } from "react";
import Link from "next/link";
import { createCampaign } from "@/app/admin/_actions";
import { AIEmailComposer } from "@/components/admin/AIEmailComposer";

interface ListOption {
  id: string;
  name: string;
  count: number;
}

interface Props {
  lists: ListOption[];
}

export function CampaignFormWithAI({ lists }: Props) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  return (
    <div className="max-w-3xl">
      <AIEmailComposer
        kind="newsletter"
        onGenerated={(s, h) => {
          setSubject(s);
          setBodyHtml(h);
        }}
      />

      <form action={createCampaign} className="space-y-6">
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
                {l.name} ({l.count} Empfänger)
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label mb-2 block">Betreff</span>
          <input
            type="text"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            maxLength={150}
            className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
          />
        </label>

        <label className="block">
          <span className="label mb-2 block">
            Inhalt (HTML, einfach erlaubt: &lt;p&gt;, &lt;a href=...&gt;, &lt;strong&gt;, &lt;br&gt;,
            &lt;img&gt;)
          </span>
          <textarea
            name="bodyHtml"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            required
            rows={16}
            placeholder={`<p>Hallo zusammen,</p>\n<p>nächste Woche startet unser neuer HYROX-Kurs! Anmeldung ab heute über den Tresen oder unter <a href="https://...">diesem Link</a>.</p>\n<p>Viele Grüße<br>— Studio Iron</p>`}
            className="w-full border border-ink/20 bg-transparent p-3 font-mono text-sm outline-none focus:border-ink"
          />
        </label>

        {bodyHtml && bodyHtml.includes("<img") && (
          <div className="border border-ink/15 bg-cream/50 p-4">
            <p className="label mb-2">Live-Vorschau (vereinfacht)</p>
            <div
              className="prose prose-sm max-w-none text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </div>
        )}

        <p className="text-xs text-muted">
          Die Mail wird automatisch in unser Studio-Layout eingebettet (Header mit Studio-Name,
          sauberes Styling).
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
