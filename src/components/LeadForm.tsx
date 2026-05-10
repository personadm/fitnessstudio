"use client";

import { useState } from "react";

type State = "idle" | "loading" | "success" | "error";
type Gender = "MAENNLICH" | "WEIBLICH" | "DIVERS";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "MAENNLICH", label: "Männlich" },
  { value: "WEIBLICH", label: "Weiblich" },
  { value: "DIVERS", label: "Divers" },
];

interface Location {
  id: string;
  name: string;
  city: string | null;
}

interface Props {
  locations?: Location[];
}

export function LeadForm({ locations = [] }: Props) {
  const onlyOne = locations.length === 1;
  const hasMany = locations.length > 1;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [locationId, setLocationId] = useState<string>(onlyOne ? locations[0].id : "");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  const locationRequired = hasMany;
  const canSubmit = !!gender && consent && (!locationRequired || !!locationId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setState("loading");
    setMessage("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          gender,
          email,
          consent,
          locationId: locationId || undefined,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setState("success");
        setMessage(data.message ?? "Bitte bestätige deine E-Mail-Adresse.");
      } else {
        setState("error");
        setMessage(data.message ?? "Etwas ist schiefgelaufen.");
      }
    } catch {
      setState("error");
      setMessage("Verbindung fehlgeschlagen.");
    }
  }

  if (state === "success") {
    return (
      <div className="border border-ink/20 bg-ink text-cream p-8 max-w-xl">
        <p className="label text-acid mb-4">✓ Eingetragen</p>
        <p className="text-display text-3xl leading-tight mb-3">Schau in dein Postfach.</p>
        <p className="text-sm leading-relaxed text-cream/80">{message}</p>
        <p className="mt-4 text-xs text-cream/60">
          Nach der Bestätigung schicken wir dir die Tarife per Mail.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" id="email">
      {/* Standort-Auswahl */}
      {hasMany && (
        <fieldset>
          <legend className="label mb-3">Standort</legend>
          <div className="grid grid-cols-2 gap-3">
            {locations.map((l) => {
              const selected = locationId === l.id;
              return (
                <label
                  key={l.id}
                  className={`cursor-pointer border px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-center transition-colors ${
                    selected
                      ? "border-ink bg-ink text-acid"
                      : "border-ink/25 hover:border-ink/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="locationId"
                    value={l.id}
                    checked={selected}
                    onChange={() => setLocationId(l.id)}
                    required
                    className="sr-only"
                  />
                  {l.name.toUpperCase()}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="label mb-2 block">Vorname</span>
          <input
            type="text"
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={state === "loading"}
            className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark disabled:opacity-50"
          />
        </label>
        <label className="block">
          <span className="label mb-2 block">Nachname</span>
          <input
            type="text"
            required
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={state === "loading"}
            className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark disabled:opacity-50"
          />
        </label>
      </div>

      <fieldset>
        <legend className="label mb-3">Geschlecht</legend>
        <div className="grid grid-cols-3 gap-2">
          {GENDERS.map((g) => {
            const selected = gender === g.value;
            return (
              <label
                key={g.value}
                className={`cursor-pointer border px-3 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-center transition-colors ${
                  selected ? "border-ink bg-ink text-acid" : "border-ink/25 hover:border-ink/50"
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

      <label className="block">
        <span className="label mb-2 block">E-Mail-Adresse</span>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="dein.name@beispiel.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === "loading"}
          className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark disabled:opacity-50"
        />
      </label>

      <label className="flex items-start gap-3 text-xs leading-relaxed text-ink-soft cursor-pointer pt-2">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-ink"
          required
        />
        <span>
          Ich willige ein, dass meine Daten zur Zusendung der Tarife verarbeitet werden. Widerruf
          jederzeit möglich. Mehr in der{" "}
          <a href="/datenschutz" className="underline underline-offset-2 hover:text-ink">
            Datenschutzerklärung
          </a>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={state === "loading" || !canSubmit}
        className="group w-full bg-ink/40 hover:bg-ink py-4 text-cream disabled:bg-ink/20 disabled:cursor-not-allowed transition-all"
      >
        <span className="font-mono text-xs uppercase tracking-[0.14em]">
          {state === "loading" ? "Sendet…" : "Tarife per Mail anfordern"}
        </span>
        <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
      </button>

      {state === "error" && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
    </form>
  );
}
