"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  highlights: string[];
};

type Gender = "MAENNLICH" | "WEIBLICH" | "DIVERS";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "MAENNLICH", label: "Männlich" },
  { value: "WEIBLICH", label: "Weiblich" },
  { value: "DIVERS", label: "Divers" },
];

interface Props {
  plans: Plan[];
  ref_: string | null;
  prefilledEmail: string;
  prefilledFirstName?: string;
  prefilledLastName?: string;
  prefilledGender?: Gender | null;
}

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export function SignupForm({
  plans,
  ref_,
  prefilledEmail,
  prefilledFirstName,
  prefilledLastName,
  prefilledGender,
}: Props) {
  const router = useRouter();
  const [pricingPlanId, setPricingPlanId] = useState(plans[0]?.id ?? "");
  const [gender, setGender] = useState<Gender | "">(prefilledGender ?? "");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!gender) return;
    setState("loading");
    setErrorMsg("");

    const fd = new FormData(e.currentTarget);
    const payload = {
      email: fd.get("email"),
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      gender,
      phone: fd.get("phone") || "",
      birthDate: fd.get("birthDate"),
      street: fd.get("street"),
      postalCode: fd.get("postalCode"),
      city: fd.get("city"),
      iban: fd.get("iban"),
      contractStartDate: fd.get("contractStartDate"),
      pricingPlanId,
      ref: ref_ ?? undefined,
      consent: fd.get("consent") === "on",
    };

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        router.push("/anmelden/danke");
      } else {
        setState("error");
        setErrorMsg(data.message ?? "Etwas ist schiefgelaufen.");
      }
    } catch {
      setState("error");
      setErrorMsg("Verbindung fehlgeschlagen.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-12 md:grid-cols-12">
      {/* Tarif-Auswahl */}
      <div className="md:col-span-5">
        <p className="label mb-4">Tarif wählen</p>
        <div className="space-y-3">
          {plans.map((p) => {
            const selected = p.id === pricingPlanId;
            return (
              <label
                key={p.id}
                className={`block cursor-pointer border p-5 transition-all ${
                  selected ? "border-ink bg-ink text-cream" : "border-ink/20 hover:border-ink/40"
                }`}
              >
                <input
                  type="radio"
                  name="pricingPlanId"
                  value={p.id}
                  checked={selected}
                  onChange={() => setPricingPlanId(p.id)}
                  className="sr-only"
                />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className={`font-mono text-[11px] uppercase tracking-[0.14em] ${
                        selected ? "text-acid" : "text-muted"
                      }`}
                    >
                      {selected ? "✓ gewählt" : "Tarif"}
                    </p>
                    <p className="mt-2 text-display text-2xl leading-tight">{p.name}</p>
                    {p.description && (
                      <p className={`mt-2 text-sm leading-relaxed ${selected ? "text-cream/80" : "text-ink-soft"}`}>
                        {p.description}
                      </p>
                    )}
                  </div>
                  <p className="text-display text-3xl whitespace-nowrap">{formatPrice(p.priceCents)}</p>
                </div>
                {p.highlights.length > 0 && (
                  <ul className={`mt-4 space-y-1 text-sm ${selected ? "text-cream/80" : "text-ink-soft"}`}>
                    {p.highlights.map((h, i) => (
                      <li key={i}>· {h}</li>
                    ))}
                  </ul>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Persönliche Daten */}
      <div className="md:col-span-7">
        <p className="label mb-4">Deine Daten</p>

        <div className="space-y-6">
          <Field
            label="E-Mail-Adresse"
            name="email"
            type="email"
            required
            defaultValue={prefilledEmail}
            readOnly={!!prefilledEmail}
          />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vorname" name="firstName" required defaultValue={prefilledFirstName} />
            <Field label="Nachname" name="lastName" required defaultValue={prefilledLastName} />
          </div>

          <fieldset>
            <legend className="label mb-3">Geschlecht</legend>
            <div className="flex flex-wrap gap-2">
              {GENDERS.map((g) => {
                const selected = gender === g.value;
                return (
                  <label
                    key={g.value}
                    className={`cursor-pointer border px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] transition-colors ${
                      selected ? "border-ink bg-ink text-acid" : "border-ink/20 hover:border-ink/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={g.value}
                      checked={selected}
                      onChange={() => setGender(g.value)}
                      className="sr-only"
                    />
                    {g.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Geburtsdatum" name="birthDate" type="date" required />
            <Field label="Telefon (optional)" name="phone" type="tel" />
          </div>
          <Field label="Straße & Hausnummer" name="street" required />
          <div className="grid grid-cols-3 gap-4">
            <Field label="PLZ" name="postalCode" required />
            <div className="col-span-2">
              <Field label="Stadt" name="city" required />
            </div>
          </div>

          {/* Phase 6: Bankdaten + Vertragsstart */}
          <div className="border-t border-ink/15 pt-6">
            <p className="label mb-4">Vertrag</p>
            <div className="space-y-6">
              <Field label="IBAN" name="iban" required placeholder="DE..." />
              <Field label="Vertragsstart" name="contractStartDate" type="date" required />
            </div>
          </div>
        </div>

        <label className="mt-8 flex items-start gap-3 text-xs leading-relaxed text-ink-soft cursor-pointer">
          <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 accent-ink" />
          <span>
            Ich habe die <a href="/agb" className="underline underline-offset-2">AGB</a> und die{" "}
            <a href="/datenschutz" className="underline underline-offset-2">Datenschutzerklärung</a> gelesen und stimme der
            Verarbeitung meiner Daten zur Vertragsabwicklung zu. Widerruf jederzeit möglich.
          </span>
        </label>

        {state === "error" && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={state === "loading" || !gender}
          className="mt-8 w-full bg-ink py-4 text-acid disabled:opacity-50 hover:bg-ink-soft transition-colors"
        >
          <span className="font-mono text-sm uppercase tracking-[0.14em]">
            {state === "loading" ? "Wird gesendet…" : "Mitgliedsantrag absenden"}
          </span>
          <span className="ml-2">→</span>
        </button>

        <p className="mt-3 text-center text-xs text-muted">
          Kein Geld wird automatisch abgebucht. Wir senden dir den Vertrag in den nächsten Werktagen.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  readOnly,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="label mb-2 block">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        readOnly={readOnly}
        placeholder={placeholder}
        className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark read-only:opacity-60"
      />
    </label>
  );
}
