"use client";

import { useState } from "react";
import Link from "next/link";
import { createCampaign } from "@/app/admin/_actions";
import { AIEmailComposer } from "@/components/admin/AIEmailComposer";
import { EmailPreview } from "@/components/admin/EmailPreview";

interface ListOption {
  id: string;
  name: string;
  count: number;
}

interface LocationOption {
  id: string;
  name: string;
  city: string | null;
}

interface Props {
  lists: ListOption[];
  locations: LocationOption[];
}

const STATUS_OPTIONS = [
  { value: "INTERESSENT", label: "Interessenten" },
  { value: "NEUKUNDE", label: "Neukunden" },
  { value: "KUNDE", label: "Mitglieder (Kunden)" },
  { value: "EHEMALIGER", label: "Ehemalige" },
];

export function CampaignFormWithAI({ lists, locations }: Props) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [targetMode, setTargetMode] = useState<"LIST" | "STATUS">(
    lists.length > 0 ? "LIST" : "STATUS",
  );
  const [listId, setListId] = useState("");
  const [targetStatus, setTargetStatus] = useState("KUNDE");
  const [targetLocationId, setTargetLocationId] = useState("");

  const hasLocations = locations.length > 0;

  return (
    <div className="max-w-3xl">
      <AIEmailComposer
        kind="newsletter"
        onGenerated={(s, h) => {
          setSubject(s);
          setBodyHtml(h);
        }}
      />

      <form action={createCampaign} className="space-y-8">
        {/* Empfänger-Targeting */}
        <div className="border border-ink/15 p-6 space-y-6">
          <p className="label">Empfänger</p>

          {/* Mode-Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTargetMode("LIST")}
              className={`px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] border ${
                targetMode === "LIST"
                  ? "border-ink bg-ink text-acid"
                  : "border-ink/20 hover:border-ink/40"
              }`}
            >
              Liste
            </button>
            <button
              type="button"
              onClick={() => setTargetMode("STATUS")}
              className={`px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] border ${
                targetMode === "STATUS"
                  ? "border-ink bg-ink text-acid"
                  : "border-ink/20 hover:border-ink/40"
              }`}
            >
              Status + Standort
            </button>
          </div>

          {/* Hidden field damit Server-Action targetMode bekommt */}
          <input type="hidden" name="targetMode" value={targetMode} />

          {targetMode === "LIST" ? (
            <div className="space-y-4">
              {lists.length === 0 ? (
                <p className="text-sm text-muted">
                  Du hast noch keine Listen.{" "}
                  <Link href="/admin/lists" className="underline">
                    Liste anlegen →
                  </Link>{" "}
                  oder unten auf „Status + Standort" wechseln.
                </p>
              ) : (
                <label className="block">
                  <span className="label mb-2 block">Welche Liste?</span>
                  <select
                    name="listId"
                    required={targetMode === "LIST"}
                    value={listId}
                    onChange={(e) => setListId(e.target.value)}
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
              )}

              {hasLocations && lists.length > 0 && (
                <label className="block">
                  <span className="label mb-2 block">
                    Zusätzlich auf Standort einschränken (optional)
                  </span>
                  <select
                    name="targetLocationId"
                    value={targetLocationId}
                    onChange={(e) => setTargetLocationId(e.target.value)}
                    className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none"
                  >
                    <option value="">Alle Standorte</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                        {l.city ? ` · ${l.city}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block">
                <span className="label mb-2 block">Welcher Status?</span>
                <select
                  name="targetStatus"
                  required={targetMode === "STATUS"}
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block font-mono text-[11px] text-muted">
                  Verschickt an alle Kontakte mit diesem Status (DOI bestätigt).
                </span>
              </label>

              {hasLocations && (
                <label className="block">
                  <span className="label mb-2 block">An welchem Standort?</span>
                  <select
                    name="targetLocationId"
                    value={targetLocationId}
                    onChange={(e) => setTargetLocationId(e.target.value)}
                    className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none"
                  >
                    <option value="">Alle Standorte</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                        {l.city ? ` · ${l.city}` : ""}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block font-mono text-[11px] text-muted">
                    Wenn gewählt: nur Kontakte an diesem Standort. Sonst: alle Standorte.
                  </span>
                </label>
              )}
            </div>
          )}
        </div>

        <label className="block">
          <span className="label mb-2 block">Betreff</span>
          <input
            type="text"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            maxLength={200}
            className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
          />
        </label>

        <label className="block">
          <span className="label mb-2 block">
            Inhalt (HTML — &lt;p&gt;, &lt;a href=...&gt;, &lt;strong&gt;, &lt;br&gt;, &lt;img&gt;)
          </span>
          <textarea
            name="bodyHtml"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            required
            rows={12}
            placeholder={`<p>Hallo zusammen,</p>\n<p>nächste Woche startet unser neuer HYROX-Kurs!</p>`}
            className="w-full border border-ink/20 bg-transparent p-3 font-mono text-sm outline-none focus:border-ink"
          />
        </label>

        {bodyHtml.trim() && (
          <div>
            <p className="label mb-2">So sieht's aus</p>
            <EmailPreview subject={subject} bodyHtml={bodyHtml} />
          </div>
        )}

        <p className="text-xs text-muted">
          Die Mail wird beim Versand automatisch in unser Studio-Layout eingebettet.
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
