"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { FunnelAiGenerator } from "./FunnelAiGenerator";
import { AIEmailComposer } from "./AIEmailComposer";
import { createFunnelFromAi } from "@/app/admin/_actions";

type Mode = "funnel" | "mail";

interface LocationOption {
  id: string;
  name: string;
}

interface Props {
  locations: LocationOption[];
}

const TRIGGERS: { value: string; label: string }[] = [
  { value: "INTERESSENT", label: "Interessent" },
  { value: "NEUKUNDE", label: "Neukunde" },
  { value: "KUNDE", label: "Kunde" },
  { value: "EHEMALIGER", label: "Ehemaliger" },
];

/**
 * Einstiegspunkt für die KI-Erstellung. Der User wählt oben, ob die KI
 * EINE einzelne Mail oder einen KOMPLETTEN Funnel (mehrere Mails) erzeugen soll.
 */
export function KiCreator({ locations }: Props) {
  const [mode, setMode] = useState<Mode>("funnel");

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2 border-b border-ink/15">
        <ModeTab active={mode === "funnel"} onClick={() => setMode("funnel")}>
          Kompletter Funnel
        </ModeTab>
        <ModeTab active={mode === "mail"} onClick={() => setMode("mail")}>
          Einzelne Mail
        </ModeTab>
      </div>

      {mode === "funnel" ? <FunnelMode locations={locations} /> : <MailMode />}
    </div>
  );
}

// ─── Modus: kompletter Funnel ───────────────────────────────────────────────

function FunnelMode({ locations }: { locations: LocationOption[] }) {
  const router = useRouter();
  const [trigger, setTrigger] = useState("INTERESSENT");
  const [locationId, setLocationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="space-y-6">
      <div className="border border-ink/15 bg-cream p-4">
        <p className="label mb-3">Funnel-Einstellungen (vor dem Übernehmen)</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="label mb-1.5 block">Auslöser</span>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="w-full border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
            >
              {TRIGGERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label mb-1.5 block">Standort</span>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
            >
              <option value="">Alle Standorte</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 font-mono text-[11px] text-muted">
          Der Funnel wird zunächst <strong>inaktiv</strong> angelegt — prüfe die Mails und schalte
          ihn danach auf der Detailseite scharf.
        </p>
      </div>

      {error && (
        <p role="alert" className="border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <FunnelAiGenerator
        onAccept={async (funnel) => {
          setSaving(true);
          setError("");
          try {
            const res = await createFunnelFromAi({
              name: funnel.name,
              trigger,
              locationId: locationId || null,
              steps: funnel.steps.map((s) => ({
                delayDays: s.delayDays,
                delayHours: s.delayHours,
                subject: s.subject,
                bodyHtml: s.bodyHtml,
              })),
            });
            if (res.ok) {
              router.push(`/admin/funnels/${res.funnelId}`);
            } else {
              setError(res.message);
              setSaving(false);
            }
          } catch {
            setError("Funnel konnte nicht angelegt werden.");
            setSaving(false);
          }
        }}
      />

      {saving && (
        <p className="font-mono text-[11px] text-muted">Funnel wird angelegt…</p>
      )}
    </div>
  );
}

// ─── Modus: einzelne Mail ───────────────────────────────────────────────────

function MailMode() {
  const [result, setResult] = useState<{ subject: string; bodyHtml: string } | null>(null);
  const [copied, setCopied] = useState<null | "subject" | "body">(null);

  async function copy(text: string, which: "subject" | "body") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* Clipboard nicht verfügbar — ignorieren */
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="label">Generierte Mail</p>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="border border-ink/20 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] hover:bg-ink/5"
          >
            Neue Mail
          </button>
        </div>

        <div className="border border-ink/15">
          <div className="flex items-center justify-between gap-3 border-b border-ink/10 bg-ink/5 px-4 py-3">
            <div className="min-w-0">
              <p className="label">Betreff</p>
              <p className="mt-0.5 truncate font-medium">{result.subject}</p>
            </div>
            <button
              type="button"
              onClick={() => copy(result.subject, "subject")}
              className="flex-shrink-0 border border-ink/20 bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-ink/5"
            >
              {copied === "subject" ? "Kopiert ✓" : "Kopieren"}
            </button>
          </div>
          <div
            className="prose prose-sm max-w-none p-4 text-sm"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.bodyHtml) }}
          />
          <div className="border-t border-ink/10 p-3">
            <button
              type="button"
              onClick={() => copy(result.bodyHtml, "body")}
              className="border border-ink/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-ink/5"
            >
              {copied === "body" ? "HTML kopiert ✓" : "HTML kopieren"}
            </button>
          </div>
        </div>

        <p className="font-mono text-[11px] text-muted leading-relaxed">
          Füge die Mail in einen Funnel-Schritt oder einen Newsletter ein (Betreff + HTML kopieren).
        </p>
      </div>
    );
  }

  return (
    <AIEmailComposer
      kind="newsletter"
      onGenerated={(subject, bodyHtml) => setResult({ subject, bodyHtml })}
    />
  );
}

// ─── UI-Helper ──────────────────────────────────────────────────────────────

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] transition-colors ${
        active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
