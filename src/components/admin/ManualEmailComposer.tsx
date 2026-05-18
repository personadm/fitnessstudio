"use client";

import { useRef, useState } from "react";

interface UploadedImage {
  base64: string;
  mediaType: string;
  filename: string;
}

interface Props {
  kind: "funnel" | "newsletter";
  onGenerated: (subject: string, bodyHtml: string) => void;
}

const MAX_IMAGES = 3;
const MAX_SIZE_MB = 3;

/**
 * Manueller E-Mail-Composer.
 *
 * User schreibt seinen Mail-Text in eine Textarea, lädt bis zu 3 Bilder hoch,
 * und kann mit Platzhaltern `[BILD-1]`, `[BILD-2]`, `[BILD-3]` festlegen wo
 * die Bilder im Text erscheinen sollen.
 *
 * Beim "Übernehmen" wird der Text in HTML konvertiert (Paragraphen, Zeilen-
 * umbrüche, automatische Links, **fett**, *kursiv*) und Bilder werden an den
 * Platzhalter-Positionen als data:-URL eingebettet. Resultierendes HTML +
 * Betreff werden an den Parent via onGenerated übergeben.
 */
export function ManualEmailComposer({ kind, onGenerated }: Props) {
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [images, setImages] = useState<(UploadedImage | null)[]>([null, null, null]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  async function handleFile(idx: number, file: File | undefined) {
    setError(null);
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError(`Bildformat nicht unterstützt: ${file.type}. Nutze JPG, PNG, WEBP oder GIF.`);
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Bild zu groß (max. ${MAX_SIZE_MB} MB).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      // result: "data:image/png;base64,...."
      const base64 = result.split(",")[1] ?? "";
      setImages((prev) => {
        const next = [...prev];
        next[idx] = { base64, mediaType: file.type, filename: file.name };
        return next;
      });
    };
    reader.readAsDataURL(file);
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    const input = fileInputRefs[idx].current;
    if (input) input.value = "";
  }

  function insertPlaceholder(idx: number) {
    const placeholder = `[BILD-${idx + 1}]`;
    setText((prev) => {
      // Mit Leerzeilen drumrum für eigenen Paragraphen
      const sep = prev && !prev.endsWith("\n") ? "\n\n" : "";
      return prev + sep + placeholder + "\n\n";
    });
  }

  function build() {
    setError(null);
    const trimmedSubject = subject.trim();
    const trimmedText = text.trim();

    if (!trimmedSubject) {
      setError("Bitte einen Betreff angeben.");
      return;
    }
    if (!trimmedText) {
      setError("Bitte den Mail-Text ausfüllen.");
      return;
    }

    const html = textToHtml(trimmedText, images);
    onGenerated(trimmedSubject, html);
  }

  return (
    <div className="border border-ink/15 bg-cream p-5 md:p-6">
      <p className="label mb-4">✍️ Selbst schreiben</p>

      <label className="block">
        <span className="label mb-2 block">Betreff</span>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="z. B. Dein Comeback-Start wartet auf dich"
          className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
        />
      </label>

      <label className="mt-6 block">
        <span className="label mb-2 block">Mail-Text</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={14}
          placeholder={`Hallo {{firstName}},\n\nschreib hier deinen Text. Doppelte Zeilenumbrüche machen einen neuen Absatz.\n\nMit [BILD-1], [BILD-2] oder [BILD-3] kannst du markieren wo deine Bilder hin sollen.\n\nLinks (https://...) werden automatisch klickbar. **fett** und *kursiv* gehen auch.`}
          className="w-full border border-ink/20 bg-white p-3 font-mono text-sm leading-relaxed outline-none focus:border-ink"
        />
      </label>

      <div className="mt-6">
        <p className="label mb-3">Bilder (optional, max. 3)</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[0, 1, 2].map((idx) => {
            const img = images[idx];
            return (
              <div key={idx} className="border border-ink/15 p-3">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                  Bild {idx + 1}
                </p>
                {img ? (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:${img.mediaType};base64,${img.base64}`}
                      alt=""
                      className="max-h-28 w-full object-contain"
                    />
                    <p className="mt-2 truncate font-mono text-[10px] text-muted">
                      {img.filename}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => insertPlaceholder(idx)}
                        className="flex-1 border border-ink bg-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-acid hover:bg-ink-soft"
                      >
                        Im Text einfügen
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="border border-ink/30 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] hover:border-ink"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex h-28 cursor-pointer flex-col items-center justify-center border border-dashed border-ink/30 text-center hover:border-ink hover:bg-ink/5">
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                      + Hochladen
                    </span>
                    <input
                      ref={fileInputRefs[idx]}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(e) => handleFile(idx, e.target.files?.[0])}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          Klick auf <strong>„Im Text einfügen"</strong> setzt einen Platzhalter wie{" "}
          <code className="font-mono">[BILD-1]</code> an der Cursor-Position. Du kannst die
          Platzhalter auch frei im Text verschieben.
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={build}
        className="mt-6 w-full bg-ink py-3 text-acid hover:bg-ink-soft md:w-auto md:px-8"
      >
        <span className="font-mono text-sm uppercase tracking-[0.14em]">
          Mail übernehmen →
        </span>
      </button>

      {/* kind ist im UI nicht sichtbar — Parameter für späteres Tracking / Logging */}
      <span className="sr-only">{kind}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Text → HTML
// ─────────────────────────────────────────────────────────────

function textToHtml(text: string, images: (UploadedImage | null)[]): string {
  // Paragraphen über doppelte Newlines splitten
  const paragraphs = text.split(/\n\s*\n+/);

  const blocks = paragraphs
    .map((para) => {
      let processed = para.trim();
      if (!processed) return "";

      // Spezialfall: Ein Paragraph ist nur ein Bild-Platzhalter
      // → kein <p> drumrum, Bild eigenständig
      const onlyImage = processed.match(/^\[BILD-([123])\]$/);
      if (onlyImage) {
        const idx = parseInt(onlyImage[1], 10) - 1;
        const img = images[idx];
        if (img) {
          return `<p style="margin:24px 0;text-align:center;"><img src="data:${img.mediaType};base64,${img.base64}" alt="" style="max-width:100%;height:auto;display:inline-block;" /></p>`;
        }
        return ""; // Platzhalter ohne Bild → weglassen
      }

      // Inline Bild-Platzhalter durch <img> ersetzen
      processed = processed.replace(/\[BILD-([123])\]/g, (_match, n: string) => {
        const idx = parseInt(n, 10) - 1;
        const img = images[idx];
        if (!img) return ""; // kein Bild da → einfach raus
        return `<img src="data:${img.mediaType};base64,${img.base64}" alt="" style="max-width:100%;height:auto;display:block;margin:16px 0;" />`;
      });

      // Markdown-mini: **fett** und *kursiv*
      processed = processed.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
      processed = processed.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");

      // Auto-Link für URLs
      processed = processed.replace(
        /(https?:\/\/[^\s<)]+)/g,
        '<a href="$1" style="color:#1A1815;text-decoration:underline;">$1</a>',
      );

      // Einzelne Newlines → <br>
      processed = processed.replace(/\n/g, "<br>");

      return `<p style="margin:0 0 16px 0;line-height:1.6;">${processed}</p>`;
    })
    .filter(Boolean);

  return blocks.join("\n");
}
