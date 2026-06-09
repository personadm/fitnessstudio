"use client";

import { useState } from "react";
import DOMPurify from "isomorphic-dompurify";

const PETROL = "#0F6E56";

interface Props {
  kind: "funnel" | "newsletter";
  onGenerated: (subject: string, bodyHtml: string) => void;
}

type Position =
  | "erste"
  | "agitate"
  | "solution"
  | "proof"
  | "objection"
  | "offer"
  | "deadline"
  | "standalone";

const POSITION_LABELS: Record<Position, { label: string; hint: string }> = {
  erste: {
    label: "1. Mail / Willkommen",
    hint: "Reine Wertvermittlung. Kein Verkauf.",
  },
  agitate: {
    label: "Pain agitieren",
    hint: "Problem benennen, Schmerz fühlbar machen.",
  },
  solution: {
    label: "Lösung zeigen",
    hint: "Lösung präsentieren + erstes Mini-Win.",
  },
  proof: {
    label: "Beweise / Testimonials",
    hint: "Vorher/Nachher, pain-based hooks.",
  },
  objection: {
    label: "Einwände behandeln",
    hint: `„Aber ich habe keine Zeit…", „Aber ich bin zu alt…"`,
  },
  offer: {
    label: "Konkretes Angebot",
    hint: "Konditionen, Garantie, was passiert beim Klick.",
  },
  deadline: {
    label: "Letzte Mail / Deadline",
    hint: "Klare Deadline + finaler Pitch.",
  },
  standalone: {
    label: "Newsletter / Einzelmail",
    hint: "Provide value + soft CTA.",
  },
};

/**
 * KI-Mail-Generator mit Hormozis E-Mail-Frameworks.
 *
 * Frameworks: Mozi-Minute-Struktur (Subject + Reward + Meat + CTA + PS),
 * Value Equation, Reward-Loops, Pain-based Testimonial-Hooks, Anti-Patterns
 * (keine Bilder, max 1–2 Links, keine Geld-Sprache im Body).
 *
 * Generiert EINE Mail. Ruft `onGenerated(subject, bodyHtml)` wenn der User
 * die generierte Mail übernehmen will.
 */
export function AIEmailComposer({ kind, onGenerated }: Props) {
  const [zielgruppe, setZielgruppe] = useState("");
  const [zielDerMail, setZielDerMail] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [position, setPosition] = useState<Position>(
    kind === "newsletter" ? "standalone" : "erste",
  );
  const [ton, setTon] = useState<"direkt" | "empathisch" | "story">("empathisch");
  const [zusatzkontext, setZusatzkontext] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    subject: string;
    previewText: string;
    bodyHtml: string;
    rationale: string;
  } | null>(null);

  async function generate() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/admin/funnels/generate-step", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          zielgruppe,
          zielDerMail,
          painPoints: painPoints || undefined,
          position,
          ton,
          zusatzkontext: zusatzkontext || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data.step);
      } else {
        setError(data.message ?? "Generierung fehlgeschlagen.");
      }
    } catch {
      setError("Verbindung zum KI-Service fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError("");
  }

  function accept() {
    if (!result) return;
    onGenerated(result.subject, result.bodyHtml);
    reset();
  }

  const canGenerate =
    zielgruppe.trim().length > 5 && zielDerMail.trim().length > 5 && !loading;

  // ── Vorschau-Modus ─────────────────────────────────────
  if (result) {
    return (
      <div className="border border-ink/15">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/15 bg-ink/5 p-4">
          <div>
            <p className="label">Vorschau</p>
            <p className="mt-1 text-base font-medium">{result.subject}</p>
            {result.previewText && (
              <p className="mt-1 text-xs italic text-muted">
                Inbox-Preview: „{result.previewText}"
              </p>
            )}
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-ink/20 bg-white px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] hover:bg-ink/5"
            >
              Verwerfen
            </button>
            <button
              type="button"
              onClick={accept}
              className="rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white"
              style={{ backgroundColor: PETROL }}
            >
              Übernehmen ↓
            </button>
          </div>
        </div>

        {result.rationale && (
          <div
            className="border-b border-ink/10 px-4 py-2 text-xs italic"
            style={{ backgroundColor: "rgba(15,110,86,0.05)" }}
          >
            <strong>Strategie:</strong> {result.rationale}
          </div>
        )}

        <div
          className="prose prose-sm max-w-none p-4 text-sm"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.bodyHtml) }}
        />
      </div>
    );
  }

  // ── Eingabe-Form ───────────────────────────────────────
  return (
    <div className="space-y-4">
      <div
        className="rounded border-l-2 p-3 text-xs"
        style={{ borderColor: PETROL, backgroundColor: "rgba(15,110,86,0.05)" }}
      >
        <strong>Hormozi-Mail-Generator.</strong> Die KI schreibt nach Mozi-Minute-Struktur
        (Subject + Reward + Meat + CTA + PS), unter 200 Wörter, ohne Bilder, ohne Geld-Sprache
        im Body — alles im warmen du-Ton der Gesundheitscoaches.
      </div>

      <Field
        label="Zielgruppe"
        placeholder="z.B. Frauen 50+ aus dem Münsterland mit Übergewicht und Knieschmerzen"
        value={zielgruppe}
        onChange={setZielgruppe}
        multiline
      />

      <Field
        label="Ziel dieser Mail"
        placeholder="z.B. Soll Vertrauen aufbauen + zeigen, dass schnelle Ergebnisse möglich sind"
        value={zielDerMail}
        onChange={setZielDerMail}
        multiline
      />

      <Field
        label="Pain Points der Zielgruppe (optional)"
        placeholder="z.B. vergebliche Diäten, Knieschmerzen, Scham im Spiegel, müde im Alltag"
        value={painPoints}
        onChange={setPainPoints}
        multiline
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="label mb-1.5 block">Position im Funnel</span>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
            className="w-full border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
          >
            {Object.entries(POSITION_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] italic text-muted">{POSITION_LABELS[position].hint}</p>
        </label>

        <label className="block">
          <span className="label mb-1.5 block">Tonalität</span>
          <select
            value={ton}
            onChange={(e) => setTon(e.target.value as typeof ton)}
            className="w-full border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
          >
            <option value="empathisch">Empathisch (warm, ohne Druck)</option>
            <option value="direkt">Direkt (klar, ergebnisorientiert)</option>
            <option value="story">Story-Mode (längere Geschichten)</option>
          </select>
        </label>
      </div>

      <Field
        label="Zusatzkontext (optional)"
        placeholder="z.B. Funnel läuft im Winter, Schwerpunkt Krankenkassen-Erstattung, oder Vorgeschichte"
        value={zusatzkontext}
        onChange={setZusatzkontext}
        multiline
      />

      {error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={!canGenerate}
          className="rounded-md px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: PETROL }}
        >
          {loading ? "Generiere Mail… (10–30 Sek)" : "Mail generieren ✦"}
        </button>
        {loading && (
          <span className="text-xs text-muted">
            Die KI schreibt eine Mail nach Hormozi-Frameworks. Bitte kurz warten.
          </span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  multiline,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full border border-ink/20 bg-white p-3 text-sm outline-none focus:border-ink"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
        />
      )}
    </label>
  );
}
