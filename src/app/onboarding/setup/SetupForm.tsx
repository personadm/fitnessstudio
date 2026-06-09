"use client";

import { useActionState, useRef, useState } from "react";
import { completeOnboarding, type OnboardingState } from "../_actions";
import { PALETTES } from "@/lib/palettes";
import { defaultLandingContent, MAX_BENEFITS, type LandingContent } from "@/lib/landing";

const BILLING_OPTIONS = [
  { value: "MONATLICH", label: "Monatlich" },
  { value: "QUARTALSWEISE", label: "Quartalsweise" },
  { value: "HALBJAEHRLICH", label: "Halbjährlich" },
  { value: "JAEHRLICH", label: "Jährlich" },
  { value: "EINMALIG", label: "Einmalig" },
];

const MAX_LOGO_BYTES = 700 * 1024;
const inputClass =
  "mt-1 w-full border-b-2 border-ink/40 bg-transparent py-2 text-base outline-none focus:border-acid_dark";

export function SetupForm({ code }: { code: string }) {
  const [state, formAction, isPending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    null,
  );

  const [studioName, setStudioName] = useState("");
  const [paletteKey, setPaletteKey] = useState(PALETTES[0].key);
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoError, setLogoError] = useState("");

  // Landing-Inhalte (editierbar; per KI vorbefüllbar)
  const [landing, setLanding] = useState<LandingContent>(() => defaultLandingContent("dein Studio"));

  // KI-Generierung
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">("idle");
  const [aiError, setAiError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function updateLanding<K extends keyof LandingContent>(key: K, value: LandingContent[K]) {
    setLanding((prev) => ({ ...prev, [key]: value }));
  }
  function updateBenefit(i: number, field: "title" | "text", value: string) {
    setLanding((prev) => {
      const benefits = prev.benefits.map((b, idx) => (idx === i ? { ...b, [field]: value } : b));
      return { ...prev, benefits };
    });
  }
  function addBenefit() {
    setLanding((prev) =>
      prev.benefits.length >= MAX_BENEFITS
        ? prev
        : { ...prev, benefits: [...prev.benefits, { title: "", text: "" }] },
    );
  }
  function removeBenefit(i: number) {
    setLanding((prev) => ({ ...prev, benefits: prev.benefits.filter((_, idx) => idx !== i) }));
  }

  async function generateFromWebsite() {
    if (!websiteUrl.trim()) {
      setAiState("error");
      setAiError("Bitte zuerst die Website-Adresse eintragen.");
      return;
    }
    setAiState("loading");
    setAiError("");
    try {
      const res = await fetch("/api/onboarding/generate-landing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, url: websiteUrl.trim(), studioName }),
      });
      const data = await res.json();
      if (data.ok && data.content) {
        setLanding(data.content as LandingContent);
        setAiState("idle");
      } else {
        setAiState("error");
        setAiError(data.message ?? "Generierung fehlgeschlagen.");
      }
    } catch {
      setAiState("error");
      setAiError("Verbindung fehlgeschlagen.");
    }
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setLogoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Bitte eine Bilddatei wählen.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo ist zu groß (max. 700 KB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }

  return (
    <form action={formAction} className="space-y-10">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="paletteKey" value={paletteKey} />
      <input type="hidden" name="logoDataUrl" value={logoDataUrl} />
      <input type="hidden" name="landingJson" value={JSON.stringify(landing)} />

      <Section title="Studio" hint="Name & Web-Adresse deiner Seite.">
        <label className="block">
          <span className="label mb-1 block">Studio-Name</span>
          <input
            name="studioName"
            required
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            placeholder="z. B. FitLife Berlin"
            className={inputClass}
          />
        </label>
        <Field
          label="Adresse / Slug (optional)"
          name="slug"
          placeholder="fitlife-berlin"
          hint="Bestimmt deine spätere Subdomain. Leer = automatisch aus dem Namen."
        />
      </Section>

      {/* KI aus bestehender Website */}
      <Section title="Texte aus deiner Website" hint="Optional — wir erzeugen daraus einen Entwurf.">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[240px] flex-1">
            <span className="label mb-1 block">Adresse deiner aktuellen Website</span>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://dein-studio.de"
              className={inputClass}
            />
          </label>
          <button
            type="button"
            onClick={generateFromWebsite}
            disabled={aiState === "loading"}
            className="border-2 border-ink px-4 py-2.5 font-mono text-xs uppercase tracking-[0.12em] hover:bg-ink hover:text-acid disabled:opacity-50"
          >
            {aiState === "loading" ? "Generiere…" : "✦ Texte generieren"}
          </button>
        </div>
        {aiState === "error" && <p className="text-sm text-red-700">{aiError}</p>}
        <p className="text-xs text-ink/50">
          Tipp: Die erzeugten Texte erscheinen unten und sind frei editierbar.
        </p>
      </Section>

      {/* Editierbare Landing-Inhalte */}
      <Section title="Landingpage-Texte" hint="Erscheinen auf deiner öffentlichen Seite.">
        <LabeledInput label="Headline" value={landing.headline} onChange={(v) => updateLanding("headline", v)} />
        <LabeledInput
          label="Subheadline"
          value={landing.subheadline}
          onChange={(v) => updateLanding("subheadline", v)}
        />
        <LabeledTextarea label="Intro" value={landing.intro} onChange={(v) => updateLanding("intro", v)} />

        <div className="space-y-3">
          <span className="label block">Vorteile</span>
          {landing.benefits.map((b, i) => (
            <div key={i} className="flex flex-wrap items-start gap-2 border-l-2 border-ink/15 pl-3">
              <input
                value={b.title}
                onChange={(e) => updateBenefit(i, "title", e.target.value)}
                placeholder="Titel"
                className="min-w-[120px] flex-1 border-b border-ink/30 bg-transparent py-1.5 text-sm outline-none focus:border-acid_dark"
              />
              <input
                value={b.text}
                onChange={(e) => updateBenefit(i, "text", e.target.value)}
                placeholder="Kurzbeschreibung"
                className="min-w-[180px] flex-[2] border-b border-ink/30 bg-transparent py-1.5 text-sm outline-none focus:border-acid_dark"
              />
              <button
                type="button"
                onClick={() => removeBenefit(i)}
                className="px-2 py-1 font-mono text-xs text-red-700 hover:underline"
                aria-label="Vorteil entfernen"
              >
                ✕
              </button>
            </div>
          ))}
          {landing.benefits.length < MAX_BENEFITS && (
            <button
              type="button"
              onClick={addBenefit}
              className="font-mono text-xs uppercase tracking-[0.1em] text-acid_dark hover:underline"
            >
              + Vorteil hinzufügen
            </button>
          )}
        </div>

        <LabeledInput
          label="Über-uns-Titel"
          value={landing.aboutTitle}
          onChange={(v) => updateLanding("aboutTitle", v)}
        />
        <LabeledTextarea
          label="Über-uns-Text"
          value={landing.aboutText}
          onChange={(v) => updateLanding("aboutText", v)}
        />
        <LabeledInput label="Button-Text (CTA)" value={landing.ctaLabel} onChange={(v) => updateLanding("ctaLabel", v)} />
      </Section>

      {/* Branding */}
      <Section title="Branding" hint="Logo & Farbwelt deiner Seite.">
        <div>
          <span className="label mb-2 block">Farb-Palette</span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PALETTES.map((p) => {
              const active = p.key === paletteKey;
              return (
                <button
                  type="button"
                  key={p.key}
                  onClick={() => setPaletteKey(p.key)}
                  className={`flex items-center gap-2 border-2 p-2 text-left transition-colors ${
                    active ? "border-ink" : "border-ink/15 hover:border-ink/40"
                  }`}
                >
                  <span className="flex shrink-0">
                    <span className="h-6 w-4" style={{ background: p.primary }} />
                    <span className="h-6 w-4" style={{ background: p.accent }} />
                  </span>
                  <span className="font-mono text-[11px] leading-tight">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="label mb-2 block">Logo (optional, max. 700 KB)</span>
          <div className="flex items-center gap-4">
            {logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoDataUrl} alt="Logo-Vorschau" className="h-16 w-16 object-contain" />
            ) : (
              <div className="grid h-16 w-16 place-items-center border-2 border-dashed border-ink/30 text-xs text-ink/40">
                Logo
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onLogoChange}
                className="block text-sm file:mr-3 file:border-2 file:border-ink file:bg-transparent file:px-3 file:py-1.5 file:font-mono file:text-xs file:uppercase file:tracking-[0.1em] hover:file:bg-ink hover:file:text-acid"
              />
              {logoDataUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoDataUrl("");
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="font-mono text-xs text-red-700 hover:underline"
                >
                  entfernen
                </button>
              )}
            </div>
          </div>
          {logoError && <p className="mt-2 text-sm text-red-700">{logoError}</p>}
        </div>
      </Section>

      <Section title="Dein Admin-Zugang" hint="Damit loggst du dich ins Backend ein.">
        <Field label="E-Mail" name="adminEmail" type="email" required placeholder="du@studio.de" />
        <Field label="Passwort" name="adminPassword" type="password" required placeholder="mind. 12 Zeichen" />
        <Field label="Dein Name (optional)" name="adminName" placeholder="Vor- und Nachname" />
      </Section>

      <Section title="Erster Standort">
        <Field label="Standort-Name" name="locationName" required placeholder="z. B. Hauptstudio" />
        <Field label="Stadt (optional)" name="city" placeholder="Berlin" />
      </Section>

      <Section title="Erster Tarif" hint="Erscheint auf deiner Anmeldeseite.">
        <Field label="Tarif-Name" name="planName" required placeholder="z. B. Premium" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Preis (€)" name="priceEur" type="number" required placeholder="49.90" />
          <label className="block">
            <span className="label mb-1 block">Abrechnung</span>
            <select name="billingInterval" defaultValue="MONATLICH" className={inputClass}>
              {BILLING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Section>

      {state?.error && (
        <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-ink py-4 text-acid disabled:opacity-50 hover:bg-ink-soft"
      >
        <span className="font-mono text-sm uppercase tracking-[0.14em]">
          {isPending ? "Lege dein Studio an…" : "Studio erstellen & loslegen →"}
        </span>
      </button>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t-2 border-ink/15 pt-6">
      <div>
        <h2 className="text-display text-xl">{title}</h2>
        {hint && <p className="mt-1 text-xs text-ink/60">{hint}</p>}
      </div>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label mb-1 block">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        step={type === "number" ? "0.01" : undefined}
        className={inputClass}
      />
      {hint && <span className="mt-1 block text-xs text-ink/50">{hint}</span>}
    </label>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="label mb-1 block">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </label>
  );
}

function LabeledTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="label mb-1 block">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-1 w-full resize-y border-2 border-ink/30 bg-transparent p-2 text-sm outline-none focus:border-acid_dark"
      />
    </label>
  );
}
