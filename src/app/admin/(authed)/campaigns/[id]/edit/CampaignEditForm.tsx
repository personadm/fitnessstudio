"use client";

import { useState } from "react";
import Link from "next/link";
import { updateCampaign } from "@/app/admin/_actions";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

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

interface CampaignData {
  id: string;
  subject: string;
  bodyHtml: string;
  listId: string | null;
  targetStatus: string | null;
  targetLocationId: string | null;
}

interface Props {
  campaign: CampaignData;
  lists: ListOption[];
  locations: LocationOption[];
}

const STATUS_OPTIONS = [
  { value: "INTERESSENT", label: "Interessenten" },
  { value: "NEUKUNDE", label: "Neukunden" },
  { value: "KUNDE", label: "Mitglieder (Kunden)" },
  { value: "EHEMALIGER", label: "Ehemalige" },
];

/**
 * Edit-Form für einen Newsletter im DRAFT-Status.
 * Alle Felder sind mit den existierenden Werten vorausgefüllt.
 *
 * Beim Speichern ruft die Form `updateCampaign` (Server-Action) auf —
 * die redirected bei Erfolg zurück zur Detail-Page.
 */
export function CampaignEditForm({ campaign, lists, locations }: Props) {
  const [subject, setSubject] = useState(campaign.subject);
  const [bodyHtml, setBodyHtml] = useState(campaign.bodyHtml);
  const [targetMode, setTargetMode] = useState<"LIST" | "STATUS">(
    campaign.listId ? "LIST" : "STATUS",
  );
  const [listId, setListId] = useState(campaign.listId ?? "");
  const [targetStatus, setTargetStatus] = useState(
    campaign.targetStatus ?? "KUNDE",
  );
  const [targetLocationId, setTargetLocationId] = useState(
    campaign.targetLocationId ?? "",
  );

  const hasLocations = locations.length > 0;
  const updateAction = updateCampaign.bind(null, campaign.id);

  return (
    <div className="max-w-3xl">
      <form action={updateAction} className="space-y-8">
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
              Status
            </button>
          </div>

          {/* Hidden Input für targetMode */}
          <input type="hidden" name="targetMode" value={targetMode} />

          {targetMode === "LIST" ? (
            <div>
              <label className="label mb-2 block">Liste auswählen</label>
              {lists.length === 0 ? (
                <p className="text-sm text-muted">
                  Noch keine Listen angelegt.{" "}
                  <Link href="/admin/lists" className="underline">
                    Eine anlegen →
                  </Link>
                </p>
              ) : (
                <select
                  name="listId"
                  value={listId}
                  onChange={(e) => setListId(e.target.value)}
                  required
                  className="w-full border-b border-ink/20 bg-transparent py-2 text-base focus:border-ink focus:outline-none"
                >
                  <option value="">— Liste auswählen —</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.count} Mitglieder)
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="label mb-2 block">Status</label>
              <select
                name="targetStatus"
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                required
                className="w-full border-b border-ink/20 bg-transparent py-2 text-base focus:border-ink focus:outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Standort-Filter (optional, nur wenn Standorte angelegt sind) */}
          {hasLocations && (
            <div>
              <label className="label mb-2 block">Standort (optional)</label>
              <select
                name="targetLocationId"
                value={targetLocationId}
                onChange={(e) => setTargetLocationId(e.target.value)}
                className="w-full border-b border-ink/20 bg-transparent py-2 text-base focus:border-ink focus:outline-none"
              >
                <option value="">Alle Standorte</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                    {loc.city ? ` · ${loc.city}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Betreff */}
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

        {/* Mail-Inhalt */}
        <div>
          <p className="label mb-2 block">Mail-Inhalt</p>
          <RichTextEditor
            initialHtml={bodyHtml}
            onChange={setBodyHtml}
            placeholder="Mail-Inhalt bearbeiten…"
          />
          <input type="hidden" name="bodyHtml" value={bodyHtml} />
          <p className="mt-2 font-mono text-[10px] text-muted leading-relaxed">
            {"· Strg+V: Text mit Formatierung aus Word/Pages einfügen"}
            <br />
            {"· 🖼 Bild: an Cursor-Position einfügen (max. 4 MB)"}
            <br />
            {"· 🔗 Link: Text markieren, dann klicken"}
            <br />
            {"· {{firstName}} wird beim Versand ersetzt"}
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="bg-ink px-6 py-2 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
          >
            Änderungen speichern
          </button>
          <Link
            href={`/admin/campaigns/${campaign.id}`}
            className="border border-ink/20 px-6 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-ink/5"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
