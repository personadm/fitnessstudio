"use client";

import { useState } from "react";
import DOMPurify from "isomorphic-dompurify";

const PETROL = "#0F6E56";

type GeneratedFunnel = {
  name: string;
  description: string;
  rationale: string;
  steps: Array<{
    orderNum: number;
    delayDays: number;
    delayHours: number;
    subject: string;
    previewText: string;
    bodyHtml: string;
    rationale: string;
  }>;
};

interface Props {
  /**
   * Wird aufgerufen wenn der User auf "Übernehmen" klickt. Hier kannst du den
   * generierten Funnel in deine existing "Funnel erstellen"-Logik einklinken
   * (z.B. eine Server-Action die Funnel + Steps in der DB anlegt).
   */
  onAccept?: (funnel: GeneratedFunnel) => void | Promise<void>;
}

/**
 * Hormozi-KI-Funnel-Generator
 *
 * Eigenständige Komponente die nach Eingabe von Zielgruppe + Ziel + Pain Points
 * über /api/admin/funnels/generate einen kompletten Funnel im Hormozi-Stil
 * generiert. Vorschau in der Komponente, dann "Übernehmen" oder "Verwerfen".
 *
 * Einbinden auf der Funnel-Erstellen-Seite. Wenn du nichts an die `onAccept`-
 * Prop hängst, kann der User den generierten Funnel zumindest schon
 * inspizieren.
 */
export function FunnelAiGenerator({ onAccept }: Props) {
  const [zielgruppe, setZielgruppe] = useState("");
  const [ziel, setZiel] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [ton, setTon] = useState<"direkt" | "empathisch" | "story">("empathisch");
  const [anzahlMails, setAnzahlMails] = useState(5);
  const [zeitplanPreset, setZeitplanPreset] = useState<"klassisch" | "schnell" | "lang">("klassisch");
  const [zusatzkontext, setZusatzkontext] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GeneratedFunnel | null>(null);

  function getZeitplan(preset: string, n: number): number[] {
    // Stunden ab Funnel-Start
    if (preset === "schnell") {
      // sofort, 3h, 1d, 2d, 3d, 5d, 7d
      const base = [0, 3, 24, 48, 72, 120, 168];
      return base.slice(0, n);
    }
    if (preset === "lang") {
      // sofort, 1d, 3d, 7d, 14d, 21d, 30d
      const base = [0, 24, 72, 168, 336, 504, 720];
      return base.slice(0, n);
    }
    // klassisch
    const base = [0, 24, 72, 120, 168, 240, 336];
    return base.slice(0, n);
  }

  async function generate() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/admin/funnels/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          zielgruppe,
          ziel,
          painPoints: painPoints || undefined,
          ton,
          anzahlMails,
          zeitabstaendeStunden: getZeitplan(zeitplanPreset, anzahlMails),
          zusatzkontext: zusatzkontext || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data.funnel as GeneratedFunnel);
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

  async function accept() {
    if (!result || !onAccept) return;
    await onAccept(result);
    reset();
  }

  const canGenerate = zielgruppe.trim().length > 5 && ziel.trim().length > 5 && !loading;

  return (
    <div className="border border-ink/15 bg-cream">
      {/* Header */}
      <div className="border-b border-ink/15 p-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: PETROL }}
            aria-hidden
          >
            ✦
          </span>
          <h3 className="text-base font-semibold">Funnel mit KI generieren</h3>
        </div>
        <p className="mt-1 text-xs text-muted">
          Baut einen Funnel nach Hormozi-Frameworks (Mozi-Minute-Struktur, Value Equation,
          Reward-Loops). Du gibst Zielgruppe + Ziel + Pain Points ein, die KI schreibt die Mails.
        </p>
      </div>

      {/* Eingabe-Form */}
      {!result && (
        <div className="space-y-4 p-4">
          <Field
            label="Zielgruppe"
            placeholder="z.B. Frauen 50+ mit Gewichtsproblemen, die schon mehrere Diäten erfolglos versucht haben"
            value={zielgruppe}
            onChange={setZielgruppe}
            multiline
          />
          <Field
            label="Ziel des Funnels"
            placeholder="z.B. Anmeldung zum 6-Wochen-Programm über die Anmeldeseite"
            value={ziel}
            onChange={setZiel}
            multiline
          />
          <Field
            label="Pain Points (optional)"
            placeholder="z.B. vergebliche Diäten, Knieschmerzen, geringe Energie im Alltag, Scham im Spiegel"
            value={painPoints}
            onChange={setPainPoints}
            multiline
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

            <label className="block">
              <span className="label mb-1.5 block">Anzahl Mails</span>
              <select
                value={anzahlMails}
                onChange={(e) => setAnzahlMails(parseInt(e.target.value, 10))}
                className="w-full border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
              >
                {[3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n} Mails
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label mb-1.5 block">Zeitplan</span>
              <select
                value={zeitplanPreset}
                onChange={(e) => setZeitplanPreset(e.target.value as typeof zeitplanPreset)}
                className="w-full border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
              >
                <option value="klassisch">Klassisch (sofort → 1d → 3d → 5d → 7d)</option>
                <option value="schnell">Schnell (sofort → 3h → 1d → 2d → 3d)</option>
                <option value="lang">Lang (sofort → 1d → 3d → 7d → 14d → 21d → 30d)</option>
              </select>
            </label>
          </div>

          <Field
            label="Zusatzkontext (optional)"
            placeholder="z.B. Funnel läuft im Winter, Schwerpunkt Krankenkassen-Erstattung, oder Vorgeschichte (Person hat Termin abgesagt)"
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
              className="rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: PETROL }}
            >
              {loading ? "Generiere Funnel… (10–60 Sek)" : "Funnel generieren ✦"}
            </button>
            {loading && (
              <span className="text-xs text-muted">
                Die KI schreibt {anzahlMails} Mails nach Hormozi-Frameworks. Bitte kurz warten.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Vorschau */}
      {result && (
        <div className="p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="label">Vorschau</p>
              <h4 className="mt-1 text-lg font-semibold">{result.name}</h4>
              <p className="mt-1 text-sm text-muted">{result.description}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-ink/20 bg-white px-4 py-2 text-sm font-semibold hover:bg-ink/5"
              >
                Verwerfen
              </button>
              {onAccept && (
                <button
                  type="button"
                  onClick={accept}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: PETROL }}
                >
                  Übernehmen
                </button>
              )}
            </div>
          </div>

          {result.rationale && (
            <div
              className="mb-4 rounded border-l-2 p-3 text-xs italic"
              style={{ borderColor: PETROL, backgroundColor: "rgba(15,110,86,0.05)" }}
            >
              <strong>Strategie der KI:</strong> {result.rationale}
            </div>
          )}

          <ol className="space-y-3">
            {result.steps.map((step) => (
              <li key={step.orderNum} className="border border-ink/15 bg-white">
                <div
                  className="flex items-center gap-3 border-b border-ink/10 px-4 py-2 text-xs"
                  style={{ backgroundColor: "rgba(15,110,86,0.05)" }}
                >
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: PETROL }}
                  >
                    {step.orderNum}
                  </span>
                  <span className="font-mono uppercase tracking-wider text-muted">
                    {formatDelay(step.delayDays, step.delayHours)}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wider text-muted">Betreff</p>
                  <p className="mt-0.5 font-semibold">{step.subject}</p>
                  {step.previewText && (
                    <>
                      <p className="mt-2 text-xs uppercase tracking-wider text-muted">Preview</p>
                      <p className="mt-0.5 text-xs text-muted italic">{step.previewText}</p>
                    </>
                  )}
                  <p className="mt-3 text-xs uppercase tracking-wider text-muted">Inhalt</p>
                  <div
                    className="prose prose-sm mt-1 max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(step.bodyHtml) }}
                  />
                  {step.rationale && (
                    <p className="mt-3 border-t border-ink/10 pt-2 text-xs italic text-muted">
                      <strong>Warum dieser Step:</strong> {step.rationale}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
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

function formatDelay(days: number, hours: number): string {
  if (days === 0 && hours === 0) return "sofort";
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} Tag${days !== 1 ? "e" : ""}`);
  if (hours > 0) parts.push(`${hours} Std`);
  return `+${parts.join(" ")}`;
}
