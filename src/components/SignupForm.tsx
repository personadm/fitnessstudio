"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TopHighlight = {
  text: string;
  subtitle?: string;
  isGold?: boolean;
};

type Plan = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  billingInterval: string;
  highlights: string[];
  topHighlights: TopHighlight[];
  agb: string | null;
  locationId: string | null;
};

type Location = {
  id: string;
  name: string;
  city: string | null;
};

type Gender = "MAENNLICH" | "WEIBLICH" | "DIVERS";

const PETROL = "#0F6E56";
const GOLD_BG = "#FAEEDA";
const GOLD_TEXT = "#854F0B";

const BILLING_SUFFIX: Record<string, string> = {
  MONATLICH: "/ Monat",
  QUARTALSWEISE: "/ Quartal",
  HALBJAEHRLICH: "/ Halbjahr",
  JAEHRLICH: "/ Jahr",
  EINMALIG: "einmalig",
};

interface Props {
  plans: Plan[];
  locations: Location[];
  ref_: string | null;
  prefilledEmail: string;
  prefilledFirstName?: string;
  prefilledLastName?: string;
  prefilledGender?: Gender | null;
  prefilledLocationId?: string | null;
  scarcityPlaces?: number | null;
  scarcityDeadlineIso?: string | null;
}

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export function SignupForm({
  plans,
  locations,
  ref_,
  prefilledEmail,
  prefilledFirstName,
  prefilledLastName,
  prefilledGender,
  prefilledLocationId,
}: Props) {
  const router = useRouter();

  // Plan-Auswahl
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");
  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? plans[0],
    [plans, selectedPlanId],
  );

  // Form-Felder (alle existing fields bleiben)
  const [firstName, setFirstName] = useState(prefilledFirstName ?? "");
  const [lastName, setLastName] = useState(prefilledLastName ?? "");
  const [email, setEmail] = useState(prefilledEmail);
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState<Gender | "">(prefilledGender ?? "");
  const [locationId, setLocationId] = useState(prefilledLocationId ?? "");
  const [agbConsent, setAgbConsent] = useState(false);
  const [datenschutzConsent, setDatenschutzConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Wenn nur eine Location existiert: vorbelegen
  useEffect(() => {
    if (locations.length === 1 && !locationId) {
      setLocationId(locations[0].id);
    }
  }, [locations, locationId]);

  // Top-Highlights: wenn Plan welche hat → diese, sonst Fallback auf die ersten 3 highlights
  const topThree: TopHighlight[] = useMemo(() => {
    if (!selectedPlan) return [];
    if (selectedPlan.topHighlights && selectedPlan.topHighlights.length > 0) {
      return selectedPlan.topHighlights.slice(0, 3);
    }
    return selectedPlan.highlights.slice(0, 3).map((text) => ({ text, isGold: false }));
  }, [selectedPlan]);

  // Restliche Highlights für die kompakte Liste (alle die nicht in Top-3 sind)
  // Wenn topHighlights gepflegt: ALLE highlights anzeigen. Sonst: alle ab Index 3.
  const restHighlights: string[] = useMemo(() => {
    if (!selectedPlan) return [];
    if (selectedPlan.topHighlights && selectedPlan.topHighlights.length > 0) {
      return selectedPlan.highlights;
    }
    return selectedPlan.highlights.slice(3);
  }, [selectedPlan]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPlan) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          birthDate,
          phone,
          street,
          postalCode,
          city,
          gender: gender || null,
          locationId: locationId || null,
          pricingPlanId: selectedPlan.id,
          ref: ref_,
          agbConsent,
          datenschutzConsent,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push("/anmelden/danke");
      } else {
        setError(data.message ?? "Anmeldung fehlgeschlagen.");
        setSubmitting(false);
      }
    } catch {
      setError("Verbindung fehlgeschlagen.");
      setSubmitting(false);
    }
  }

  if (!selectedPlan) {
    return null;
  }

  const hasMultiplePlans = plans.length > 1;
  const needsLocationChoice = locations.length > 1;
  const canSubmit =
    agbConsent &&
    datenschutzConsent &&
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    birthDate &&
    street.trim() &&
    postalCode.trim() &&
    city.trim() &&
    (!needsLocationChoice || locationId);

  return (
    <div className="space-y-6">
      {/* Plan-Switcher — nur bei mehreren aktiven Plans */}
      {hasMultiplePlans && (
        <div className="flex flex-wrap gap-2">
          {plans.map((p) => {
            const selected = p.id === selectedPlanId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlanId(p.id)}
                className="rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
                style={{
                  borderColor: selected ? PETROL : "#D8D2C7",
                  backgroundColor: selected ? PETROL : "#FFFFFF",
                  color: selected ? "#FFFFFF" : "#2C2C2A",
                }}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Tarif-Karte mit Preis-Anker */}
      <article className="rounded-xl border border-[#E8E2D5] bg-white p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-2xl font-bold leading-tight text-[#2C2C2A] md:text-3xl">
            {selectedPlan.name}
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="text-base text-[#A8A39A] line-through">199 €</span>
            <span className="text-3xl font-bold md:text-4xl" style={{ color: PETROL }}>
              {formatPrice(selectedPlan.priceCents)}
            </span>
            {selectedPlan.billingInterval !== "EINMALIG" && (
              <span className="text-sm text-[#5F5E5A]">
                {BILLING_SUFFIX[selectedPlan.billingInterval] ?? ""}
              </span>
            )}
          </div>
        </div>

        {selectedPlan.description && (
          <p className="mt-3 text-sm text-[#5F5E5A]">{selectedPlan.description}</p>
        )}

        {/* Die 3 großen Highlight-Kacheln */}
        {topThree.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {topThree.map((h, idx) => (
              <HighlightCard key={idx} highlight={h} />
            ))}
          </div>
        )}

        {/* Restliche Leistungen als 2-spaltige Häkchenliste */}
        {restHighlights.length > 0 && (
          <div className="mt-6 border-t border-[#E8E2D5] pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#5F5E5A]">
              Außerdem alles dabei:
            </p>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {restHighlights.map((h, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-[#2C2C2A]">
                  <span style={{ color: PETROL }} className="font-bold">
                    ✓
                  </span>
                  <span className="leading-snug">{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {/* Zufriedenheitsgarantie */}
      <div
        className="flex items-start gap-3 rounded-xl border p-5"
        style={{
          borderColor: "rgba(15,110,86,0.25)",
          backgroundColor: "rgba(15,110,86,0.06)",
        }}
      >
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: PETROL, color: "#FFFFFF" }}
          aria-hidden
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L4 6v6c0 5 3.5 9.7 8 10 4.5-.3 8-5 8-10V6l-8-4z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M8 12l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-[#2C2C2A]">Zufriedenheitsgarantie</p>
          <p className="mt-1 text-sm leading-relaxed text-[#2C2C2A]">
            Nach den 6 Wochen entscheidest du komplett frei, ob und wie du
            weitermachst. Keine automatische Verpflichtung — dein einmaliges
            Rücktrittsrecht ist eingebaut.
          </p>
        </div>
      </div>

      {/* 2 Testimonials direkt vor Form */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Testimonial
          initials="EJ"
          name="Elke, 47"
          quote="„15 kg weniger, 8 cm Bauchumfang verloren – und endlich schmerzfrei.""
        />
        <Testimonial
          initials="CS"
          name="Christel, 69"
          quote="„Die OP wurde überflüssig, 10 kg runter und neue Lebensfreude.""
        />
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="rounded-xl border border-[#E8E2D5] bg-white p-5 md:p-7">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: "rgba(15,110,86,0.1)",
              color: PETROL,
            }}
          >
            Schritt 2
          </span>
          <h2 className="text-xl font-bold text-[#2C2C2A] md:text-2xl">
            Nur noch deine Daten
          </h2>
        </div>
        <p className="mb-5 flex items-start gap-1.5 text-sm text-[#5F5E5A]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>
            Adresse & Geburtsdatum brauchen wir für deine Bescheinigung zur
            Kassen-Erstattung.
          </span>
        </p>

        <div className="space-y-3">
          {/* Vor- und Nachname */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Vorname"
              required
              value={firstName}
              onChange={setFirstName}
              autoComplete="given-name"
              disabled={submitting}
            />
            <Input
              label="Nachname"
              required
              value={lastName}
              onChange={setLastName}
              autoComplete="family-name"
              disabled={submitting}
            />
          </div>

          {/* E-Mail volle Breite */}
          <Input
            label="E-Mail-Adresse"
            required
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            disabled={submitting}
          />

          {/* Geburtsdatum + Telefon */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Geburtsdatum"
              required
              type="date"
              value={birthDate}
              onChange={setBirthDate}
              disabled={submitting}
            />
            <Input
              label="Telefon (mobil)"
              type="tel"
              value={phone}
              onChange={setPhone}
              autoComplete="tel"
              disabled={submitting}
            />
          </div>

          {/* Straße volle Breite */}
          <Input
            label="Straße & Hausnummer"
            required
            value={street}
            onChange={setStreet}
            autoComplete="street-address"
            disabled={submitting}
          />

          {/* PLZ + Stadt */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="PLZ"
              required
              value={postalCode}
              onChange={setPostalCode}
              autoComplete="postal-code"
              disabled={submitting}
            />
            <Input
              label="Stadt"
              required
              value={city}
              onChange={setCity}
              autoComplete="address-level2"
              disabled={submitting}
            />
          </div>

          {/* Standort (falls mehrere) */}
          {needsLocationChoice && (
            <label className="block">
              <span className="block text-sm font-medium text-[#2C2C2A]">Studio</span>
              <select
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                disabled={submitting}
                className="mt-1.5 w-full rounded-lg border border-[#D8D2C7] bg-white px-3 py-2.5 text-base outline-none focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56]"
              >
                <option value="" disabled>
                  Studio wählen…
                </option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.city ? ` · ${l.city}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {/* Consents */}
        <div className="mt-5 space-y-3">
          {selectedPlan.agb && (
            <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-[#5F5E5A]">
              <input
                type="checkbox"
                checked={agbConsent}
                onChange={(e) => setAgbConsent(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 accent-[#0F6E56]"
              />
              <span>
                Ich akzeptiere die{" "}
                <a
                  href="/agb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-[#2C2C2A]"
                >
                  AGB
                </a>{" "}
                und Vertragsbedingungen für diesen Tarif.
              </span>
            </label>
          )}
          {!selectedPlan.agb && (
            <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-[#5F5E5A]">
              <input
                type="checkbox"
                checked={agbConsent}
                onChange={(e) => setAgbConsent(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 accent-[#0F6E56]"
              />
              <span>
                Ich akzeptiere die{" "}
                <a
                  href="/agb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-[#2C2C2A]"
                >
                  AGB
                </a>
                .
              </span>
            </label>
          )}

          <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-[#5F5E5A]">
            <input
              type="checkbox"
              checked={datenschutzConsent}
              onChange={(e) => setDatenschutzConsent(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 accent-[#0F6E56]"
            />
            <span>
              Ich willige in die Verarbeitung meiner Daten gemäß{" "}
              <a
                href="/datenschutz"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[#2C2C2A]"
              >
                Datenschutzerklärung
              </a>{" "}
              ein.
            </span>
          </label>
        </div>

        {/* Submit-Button */}
        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="mt-6 w-full rounded-lg px-5 py-3.5 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: PETROL }}
        >
          {submitting ? "Wird gesendet…" : "Jetzt starten →"}
        </button>

        {/* Microcopy unter Button */}
        <p
          className="mt-3 text-center text-sm font-semibold"
          style={{ color: PETROL }}
        >
          {formatPrice(selectedPlan.priceCents)} einmalig · bis zu 100 % von deiner
          Krankenkasse erstattet
        </p>
        <p className="mt-2 text-center text-xs leading-relaxed text-[#8A857E]">
          Danach 12 Monate Mitgliedschaft (59,99 €/Monat) – dank Zufriedenheitsgarantie
          entscheidest du nach 6 Wochen frei. Es gelten die AGB.
        </p>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Subkomponenten
// ─────────────────────────────────────────────────────────────

function HighlightCard({ highlight }: { highlight: TopHighlight }) {
  const isGold = highlight.isGold === true;

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: isGold ? GOLD_BG : "#FFFFFF",
        borderColor: isGold ? "rgba(133,79,11,0.25)" : "#E8E2D5",
      }}
    >
      <div
        className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full"
        style={{
          backgroundColor: isGold ? "rgba(133,79,11,0.15)" : "rgba(15,110,86,0.1)",
          color: isGold ? GOLD_TEXT : PETROL,
        }}
        aria-hidden
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12l5 5L20 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p
        className="text-sm font-semibold leading-snug"
        style={{ color: isGold ? GOLD_TEXT : "#2C2C2A" }}
      >
        {highlight.text}
      </p>
      {highlight.subtitle && (
        <p
          className="mt-0.5 text-xs"
          style={{ color: isGold ? "rgba(133,79,11,0.85)" : "#5F5E5A" }}
        >
          {highlight.subtitle}
        </p>
      )}
    </div>
  );
}

function Testimonial({
  initials,
  name,
  quote,
}: {
  initials: string;
  name: string;
  quote: string;
}) {
  return (
    <article className="rounded-xl border border-[#E8E2D5] bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
          style={{
            backgroundColor: "rgba(15,110,86,0.1)",
            color: PETROL,
          }}
        >
          {initials}
        </span>
        <span className="text-sm font-semibold text-[#2C2C2A]">{name}</span>
      </div>
      <p className="text-sm leading-relaxed text-[#5F5E5A]">{quote}</p>
    </article>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-[#D8D2C7] bg-white px-3 py-2.5 text-base placeholder:text-[#A8A39A] outline-none transition-colors focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56] disabled:opacity-50"
      />
    </label>
  );
}
