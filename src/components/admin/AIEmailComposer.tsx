"use client";

import { useRef, useState } from "react";

type Tone = "warm" | "professionell" | "kurz" | "motivierend";
type Kind = "newsletter" | "funnel";

interface Props {
  kind: Kind;
  onGenerated: (subject: string, bodyHtml: string) => void;
}

interface UploadedImage {
  base64: string; // raw, ohne Data-URI-Prefix
  mediaType: string;
  preview: string; // Data-URI für Vorschau
}

const TONES: { value: Tone; label: string; hint: string }[] = [
  { value: "warm", label: "Warm & locker", hint: "persönlich, wie der Trainer" },
  { value: "professionell", label: "Professionell", hint: "sachlich, kompetent" },
  { value: "kurz", label: "Kurz & knapp", hint: "max. 4 Sätze, direkt" },
  { value: "motivierend", label: "Motivierend", hint: "Drive, Action, Energie" },
];

const MAX_IMAGES = 3;

export function AIEmailComposer({ kind, onGenerated }: Props) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState<Tone>("warm");
  const [state, setState] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = MAX_IMAGES - images.length;
    const toProcess = files.slice(0, remaining);

    setErrorMsg("");
    const newImages: UploadedImage[] = [];

    for (const file of toProcess) {
      try {
        const compressed = await compressImage(file);
        newImages.push(compressed);
      } catch (err) {
        console.error("Komprimierung fehlgeschlagen:", err);
        setErrorMsg(`Bild "${file.name}" konnte nicht verarbeitet werden.`);
      }
    }

    if (newImages.length > 0) {
      setImages([...images, ...newImages]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages(images.filter((_, i) => i !== index));
  }

  async function generate() {
    if (!brief.trim()) {
      setErrorMsg("Bitte gib ein Briefing ein.");
      setState("error");
      return;
    }

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/ai-compose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brief: brief.trim(),
          tone,
          kind,
          images: images.map((img) => ({ base64: img.base64, mediaType: img.mediaType })),
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setErrorMsg(data.message ?? "Fehler bei der Generierung.");
        setState("error");
        return;
      }

      onGenerated(data.subject, data.bodyHtml);
      setState("success");
      // Bleibt offen, zeigt Erfolg, User kann nochmal generieren oder schließen
    } catch (err) {
      console.error(err);
      setErrorMsg("Verbindungsfehler.");
      setState("error");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 w-full border border-acid_dark bg-acid/30 px-5 py-4 text-left hover:bg-acid/50 transition-colors"
      >
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-ink">
          ✨ Mit KI generieren
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Foto + Stichworte → fertige Mail. Ton wählbar.
        </p>
      </button>
    );
  }

  return (
    <div className="mb-6 border border-acid_dark bg-acid/10 p-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="label">✨ KI-Texter</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted hover:text-ink"
        >
          Schließen
        </button>
      </div>

      <div className="space-y-5">
        {/* Foto-Upload */}
        <div>
          <p className="label mb-2">Fotos (optional, max. {MAX_IMAGES})</p>

          {images.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-square border border-ink/20 overflow-hidden bg-ink/5"
                >
                  <img src={img.preview} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-ink/80 text-cream font-mono text-xs px-2 py-0.5 hover:bg-ink"
                    aria-label="Entfernen"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {images.length < MAX_IMAGES && (
            <label className="block cursor-pointer border border-dashed border-ink/30 bg-cream/50 p-6 text-center hover:border-ink/60 hover:bg-cream transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileSelect}
                disabled={state === "loading"}
                className="sr-only"
              />
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
                Bilder auswählen
              </p>
              <p className="mt-1 text-xs text-muted">
                JPG, PNG, WEBP — werden auf 1200px komprimiert
              </p>
            </label>
          )}
        </div>

        {/* Briefing */}
        <label className="block">
          <span className="label mb-2 block">Worum geht's? (Briefing)</span>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            disabled={state === "loading"}
            rows={4}
            placeholder="Z.B.: Neuer HYROX-Kurs ab Montag mit Anna. Anmeldung über Tresen oder Antwort-Mail. Warm halten, persönlich, kein Marketing-Sprech."
            className="w-full border border-ink/20 bg-cream/50 p-3 text-sm outline-none focus:border-ink resize-y"
            maxLength={2000}
          />
          <p className="mt-1 font-mono text-[10px] text-muted text-right">
            {brief.length} / 2000
          </p>
        </label>

        {/* Ton */}
        <fieldset>
          <legend className="label mb-3">Ton</legend>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map((t) => {
              const selected = tone === t.value;
              return (
                <label
                  key={t.value}
                  className={`cursor-pointer border p-3 transition-colors ${
                    selected
                      ? "border-ink bg-ink text-cream"
                      : "border-ink/20 hover:border-ink/40 bg-cream/50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`ai-tone-${kind}`}
                    value={t.value}
                    checked={selected}
                    onChange={() => setTone(t.value)}
                    className="sr-only"
                  />
                  <p className="font-mono text-xs uppercase tracking-[0.1em]">
                    {selected ? "✓ " : ""}
                    {t.label}
                  </p>
                  <p className={`mt-1 text-xs ${selected ? "text-cream/70" : "text-muted"}`}>
                    {t.hint}
                  </p>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Action */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-ink/10">
          <button
            type="button"
            onClick={generate}
            disabled={state === "loading" || !brief.trim()}
            className="bg-ink px-5 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-acid disabled:opacity-50 hover:bg-ink-soft"
          >
            {state === "loading"
              ? "Generiert…"
              : state === "success"
              ? "Nochmal generieren"
              : "Mail generieren"}
          </button>
          {state === "loading" && (
            <p className="font-mono text-xs text-muted">
              KI denkt nach — kann 10–20 Sekunden dauern…
            </p>
          )}
          {state === "success" && (
            <p className="font-mono text-xs text-acid_dark">
              ✓ Mail generiert — Felder unten ausgefüllt. Editierbar.
            </p>
          )}
        </div>

        {state === "error" && errorMsg && (
          <p role="alert" className="text-sm text-red-700 border border-red-300 bg-red-50 p-3">
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Komprimiert ein Bild client-seitig auf max. 1200px Breite, JPEG quality 0.82.
 * Reduziert die Größe drastisch — typisch von 3-5MB Original auf 50-150KB.
 */
async function compressImage(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1200;
        const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas wird nicht unterstützt"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);

        const dataUri = canvas.toDataURL("image/jpeg", 0.82);
        const base64 = dataUri.split(",")[1];

        resolve({
          base64,
          mediaType: "image/jpeg",
          preview: dataUri,
        });
      };
      img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden"));
    reader.readAsDataURL(file);
  });
}
