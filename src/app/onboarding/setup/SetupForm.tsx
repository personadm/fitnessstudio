"use client";

import { useActionState } from "react";
import { completeOnboarding, type OnboardingState } from "../_actions";

const BILLING_OPTIONS: { value: string; label: string }[] = [
  { value: "MONATLICH", label: "Monatlich" },
  { value: "QUARTALSWEISE", label: "Quartalsweise" },
  { value: "HALBJAEHRLICH", label: "Halbjährlich" },
  { value: "JAEHRLICH", label: "Jährlich" },
  { value: "EINMALIG", label: "Einmalig" },
];

const inputClass =
  "mt-1 w-full border-b-2 border-ink/40 bg-transparent py-2 text-base outline-none focus:border-acid_dark";

export function SetupForm({ code }: { code: string }) {
  const [state, formAction, isPending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    null,
  );

  return (
    <form action={formAction} className="space-y-10">
      <input type="hidden" name="code" value={code} />

      <Section title="Studio" hint="Name & Web-Adresse deiner Seite.">
        <Field label="Studio-Name" name="studioName" required placeholder="z. B. FitLife Berlin" />
        <Field
          label="Adresse / Slug (optional)"
          name="slug"
          placeholder="fitlife-berlin"
          hint="Bestimmt deine spätere Subdomain. Leer lassen = automatisch aus dem Namen."
        />
      </Section>

      <Section title="Branding" hint="Optional — später im Backend änderbar.">
        <Field label="Markenfarbe (Hex, optional)" name="primaryColor" placeholder="#0F6E56" />
        <Field label="Logo-URL (optional)" name="logoUrl" placeholder="https://…/logo.png" />
      </Section>

      <Section title="Dein Admin-Zugang" hint="Damit loggst du dich ins Backend ein.">
        <Field label="E-Mail" name="adminEmail" type="email" required placeholder="du@studio.de" />
        <Field
          label="Passwort"
          name="adminPassword"
          type="password"
          required
          placeholder="mind. 12 Zeichen"
        />
        <Field label="Dein Name (optional)" name="adminName" placeholder="Vor- und Nachname" />
      </Section>

      <Section title="Erster Standort" hint="Mindestens einer wird benötigt.">
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

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4 border-t-2 border-ink/15 pt-6">
      <legend className="sr-only">{title}</legend>
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
