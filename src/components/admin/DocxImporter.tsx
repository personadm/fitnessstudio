"use client";

import { useState } from "react";

interface Props {
  kind: "funnel" | "newsletter";
  onGenerated: (subject: string, bodyHtml: string) => void;
}

type State = "idle" | "uploading" | "ready" | "error";

/**
 * Importiert eine fertige Mail aus einem Word-Dokument (.docx).
 * Workflow für den User:
 *   1. In Pages: Ablage → Exportieren als → Word → speichern als .docx
 *   2. Hier hochladen → Server konvertiert via mammoth → HTML
 *   3. Vorschau prüfen → Übernehmen → erscheint im Funnel-Step-Form
 */
export function DocxImporter({ onGenerated }: Props) {
  const [subject, setSubject] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [html, setHtml] = useState<string>("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setState("uploading");
    setMessage("");
    setWarnings([]);
    setFilename(file.name);

    const fd = new FormData();
    fd.append("docx", file);

    try {
      const res = await fetch("/api/admin/import-docx", { method: "POST", body: fd });
      const data = (await res.json()) as {
        ok?: boolean;
        html?: string;
        warnings?: string[];
        message?: string;
      };

      if (!res.ok || !data.ok || !data.html) {
        setState("error");
        setMessage(data.message ?? "Konvertierung fehlgeschlagen.");
        setHtml("");
        return;
      }

      setHtml(data.html);
      setWarnings(data.warnings ?? []);
      setState("ready");
    } catch {
      setState("error");
      setMessage("Netzwerkfehler. Versuch's nochmal.");
      setHtml("");
    }
  }

  function handleSubmit() {
    if (!subject.trim()) {
      setMessage("Bitte einen Betreff angeben.");
      return;
    }
    if (!html) {
      setMessage("Bitte erst eine Datei hochladen.");
      return;
    }
    onGenerated(subject.trim(), html);
  }

  return (
    <div className="border border-ink/15 bg-cream p-5 md:p-6">
      <p className="label mb-2">📄 Aus Pages-/Word-Datei importieren</p>
      <p className="mb-5 text-sm leading-relaxed text-ink-soft">
        In Pages: <strong>Ablage → Exportieren als → Word</strong> → Datei hier hochladen.
        Bilder werden automatisch übernommen.
      </p>

      {/* Betreff */}
      <label className="block">
        <span className="label mb-2 block">Betreff</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="z. B. Dein Comeback-Start wartet"
          className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
        />
      </label>

      {/* Datei-Upload */}
      <div className="mt-6">
        <label className="flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-ink/30 p-8 text-center hover:border-ink hover:bg-ink/5">
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
            {state === "uploading"
              ? "Wird hochgeladen…"
              : filename
                ? `📎 ${filename}`
                : "+ Word-Datei wählen (.docx)"}
          </span>
          {!filename && (
            <span className="mt-2 text-xs text-muted">
              Max. 20 MB · nur .docx
            </span>
          )}
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={state === "uploading"}
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      </div>

      {/* Warnungen */}
      {warnings.length > 0 && (
        <div className="mt-4 border border-amber-300 bg-amber-50 p-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-amber-800">
            Hinweise beim Import
          </p>
          <ul className="mt-2 list-disc pl-5 text-xs text-amber-900">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {message && state === "error" && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {message}
        </p>
      )}

      {/* Vorschau */}
      {html && state === "ready" && (
        <div className="mt-6">
          <p className="label mb-2">Vorschau</p>
          <div className="max-h-96 overflow-auto border border-ink/15 bg-white p-5">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      )}

      {/* Allgemeine Hinweise unter dem Button */}
      {message && state !== "error" && (
        <p className="mt-4 text-sm text-red-700">{message}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!html || !subject.trim() || state === "uploading"}
        className="mt-6 w-full bg-ink py-3 text-acid hover:bg-ink-soft disabled:opacity-50 md:w-auto md:px-8"
      >
        <span className="font-mono text-sm uppercase tracking-[0.14em]">
          Mail übernehmen →
        </span>
      </button>
    </div>
  );
}
