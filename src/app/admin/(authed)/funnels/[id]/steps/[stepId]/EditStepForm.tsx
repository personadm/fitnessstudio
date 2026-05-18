"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  htmlToEditableText,
  editableTextToHtml,
  type UploadedImage,
} from "@/lib/mailContent";

interface Props {
  stepId: string;
  funnelId: string;
  initialSubject: string;
  initialBodyHtml: string;
  initialDelayDays: number;
  initialDelayHours: number;
  scheduleMode: boolean;
  action: (formData: FormData) => Promise<void>;
}

const MAX_SIZE_MB = 3;

export function EditStepForm({
  funnelId,
  initialSubject,
  initialBodyHtml,
  initialDelayDays,
  initialDelayHours,
  scheduleMode,
  action,
}: Props) {
  // Beim ersten Mount: HTML → editierbarer Text + Bilder-Array
  const initial = useMemo(() => htmlToEditableText(initialBodyHtml), [initialBodyHtml]);

  const [subject, setSubject] = useState(initialSubject);
  const [text, setText] = useState(initial.text);
  const [images, setImages] = useState<(UploadedImage | null)[]>(() => {
    const arr: (UploadedImage | null)[] = [null, null, null];
    initial.images.forEach((img, i) => {
      if (i < 3) arr[i] = img;
    });
    return arr;
  });
  const [delayDays, setDelayDays] = useState(initialDelayDays);
  const [delayHours, setDelayHours] = useState(initialDelayHours);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  function handleFile(idx: number, file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError(`Bildformat nicht unterstützt. Nutze JPG, PNG, WEBP oder GIF.`);
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
      const sep = prev && !prev.endsWith("\n") ? "\n\n" : "";
      return prev + sep + placeholder + "\n\n";
    });
  }

  // Live-HTML aus aktuellem Text + Bildern (für Preview + hidden submit)
  const builtHtml = editableTextToHtml(text, images);

  return (
    <form action={action} className="space-y-8">
      {/* Wartezeit */}
      {scheduleMode ? (
        <div className="border border-ink/15 bg-ink/5 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Wochenplan-Modus
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Dieser Funnel folgt einem festen Wochenplan — die Wartezeit ergibt sich automatisch
            aus der Schritt-Reihenfolge.
          </p>
          <input type="hidden" name="delayDays" value={initialDelayDays} />
          <input type="hidden" name="delayHours" value={initialDelayHours} />
        </div>
      ) : (
        <div>
          <p className="label mb-3">Wartezeit ab Eintritt in den Funnel</p>
          <div className="grid grid-cols-2 gap-4 md:max-w-md">
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                Tage
              </span>
              <input
                type="number"
                name="delayDays"
                min={0}
                max={3650}
                value={delayDays}
                onChange={(e) => setDelayDays(Number(e.target.value))}
                className="mt-1 w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                Stunden
              </span>
              <input
                type="number"
                name="delayHours"
                min={0}
                max={23}
                value={delayHours}
                onChange={(e) => setDelayHours(Number(e.target.value))}
                className="mt-1 w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
              />
            </label>
          </div>
        </div>
      )}

      {/* Betreff */}
      <div>
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
        <p className="mt-1 text-xs text-muted">{subject.length} / 200 Zeichen</p>
      </div>

      {/* Mail-Text */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="label">Mail-Text</span>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="font-mono text-[11px] uppercase tracking-[0.14em] underline underline-offset-4 hover:text-ink-soft"
          >
            {showPreview ? "Zurück zum Bearbeiten" : "Vorschau zeigen"}
          </button>
        </div>

        {showPreview ? (
          <div className="border border-ink/20 bg-white p-5 min-h-[400px]">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: builtHtml }}
            />
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={18}
            className="w-full border border-ink/20 bg-white p-3 font-mono text-sm leading-relaxed outline-none focus:border-ink"
          />
        )}

        <p className="mt-2 text-xs text-muted">
          Doppelte Zeilenumbrüche = neuer Absatz. <strong>**fett**</strong>,{" "}
          <em>*kursiv*</em>, Links (https://…) werden automatisch klickbar.{" "}
          <code className="font-mono">{"{{firstName}}"}</code> wird beim Versand durch den
          Vornamen ersetzt.
        </p>
      </div>

      {/* Bilder */}
      <div>
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
          „Im Text einfügen" setzt einen Platzhalter wie{" "}
          <code className="font-mono">[BILD-1]</code> in den Mail-Text. Du kannst den
          Platzhalter auch frei verschieben oder löschen.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Hidden Field mit fertigem HTML — geht an die Server-Action */}
      <input type="hidden" name="bodyHtml" value={builtHtml} />

      {/* Buttons */}
      <div className="flex flex-col gap-3 border-t border-ink/15 pt-6 md:flex-row md:items-center md:justify-between">
        <Link
          href={`/admin/funnels/${funnelId}`}
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink"
        >
          Abbrechen
        </Link>
        <button type="submit" className="bg-ink px-8 py-3 text-acid hover:bg-ink-soft">
          <span className="font-mono text-sm uppercase tracking-[0.14em]">
            Änderungen speichern →
          </span>
        </button>
      </div>
    </form>
  );
}
