"use client";

import { useState } from "react";

type State = "idle" | "loading" | "success" | "error";

type Location = {
  id: string;
  name: string;
  city: string | null;
};

interface Props {
  locations: Location[];
}

const PETROL = "#0F6E56";

/**
 * Schlankes Lead-Formular für die Landing-Page Hero-Sektion:
 *  - Vorname (required)
 *  - E-Mail (required)
 *  - Standort (Pflicht nur wenn mehrere aktive Locations existieren)
 *  - DSGVO-Consent
 *
 * Backend (/api/leads) akzeptiert lastName und gender als optional, sodass
 * dieses schlanke Formular weiterhin funktioniert.
 */
export function LeadForm({ locations }: Props) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [locationId, setLocationId] = useState(
    locations.length === 1 ? locations[0].id : "",
  );
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  const needsLocationChoice = locations.length > 1;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMessage("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName,
          email,
          locationId: locationId || null,
          consent,
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
      <div
        className="rounded-xl border bg-white p-8 shadow-sm"
        style={{ borderColor: "rgba(15,110,86,0.2)" }}
      >
        <div
          className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: "rgba(15,110,86,0.1)", color: PETROL }}
        >
          ✓ Eingetragen
        </div>
        <h3 className="mb-3 text-xl font-semibold text-[#2C2C2A]">
          Schau in dein Postfach.
        </h3>
        <p className="text-sm leading-relaxed text-[#5F5E5A]">{message}</p>
        <p className="mt-3 text-xs text-[#8A857E]">
          Nach der Bestätigung schalten wir dein Gratis-Start-Angebot frei.
        </p>
      </div>
    );
  }

  const canSubmit =
    consent &&
    firstName.trim() &&
    email.trim() &&
    (!needsLocationChoice || locationId);

  return (
    <form
      onSubmit={onSubmit}
      id="email"
      className="rounded-xl border border-[#E8E2D5] bg-white p-6 md:p-7"
    >
      <h3 className="text-2xl font-semibold text-[#2C2C2A]">Dein Gratis-Start-Plan</h3>
      <p className="mt-1 text-sm text-[#5F5E5A]">Sofort per Mail. In Ruhe durchlesen.</p>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="block text-sm font-medium text-[#2C2C2A]">Vorname</span>
          <input
            type="text"
            required
            autoComplete="given-name"
            placeholder="Dein Vorname"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={state === "loading"}
            className="mt-1.5 w-full rounded-lg border border-[#D8D2C7] bg-white px-3 py-2.5 text-base placeholder:text-[#A8A39A] outline-none transition-colors focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56] disabled:opacity-50"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-[#2C2C2A]">E-Mail-Adresse</span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="name@mail.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state === "loading"}
            className="mt-1.5 w-full rounded-lg border border-[#D8D2C7] bg-white px-3 py-2.5 text-base placeholder:text-[#A8A39A] outline-none transition-colors focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56] disabled:opacity-50"
          />
        </label>

        {needsLocationChoice && (
          <label className="block">
            <span className="block text-sm font-medium text-[#2C2C2A]">Standort</span>
            <select
              required
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              disabled={state === "loading"}
              className="mt-1.5 w-full rounded-lg border border-[#D8D2C7] bg-white px-3 py-2.5 text-base outline-none transition-colors focus:border-[#0F6E56] focus:ring-1 focus:ring-[#0F6E56] disabled:opacity-50"
            >
              <option value="" disabled>
                Standort wählen…
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

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-[#5F5E5A]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
          className="mt-0.5 h-4 w-4 accent-[#0F6E56]"
        />
        <span>
          Ich willige ein, dass meine Daten zur Zusendung des Gratis-Start-Angebots
          verarbeitet werden. Widerruf jederzeit per Klick auf den Abmelde-Link in jeder
          Mail. Mehr in der{" "}
          <a
            href="/datenschutz"
            className="underline underline-offset-2 hover:text-[#2C2C2A]"
          >
            Datenschutzerklärung
          </a>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={state === "loading" || !canSubmit}
        className="mt-5 w-full rounded-lg px-5 py-3.5 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: PETROL }}
      >
        {state === "loading" ? "Sendet…" : "Ja, schick mir meinen Gratis-Start-Plan →"}
      </button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#8A857E]">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M3 5V3.5a3 3 0 016 0V5h.5a1 1 0 011 1v4a1 1 0 01-1 1h-7a1 1 0 01-1-1V6a1 1 0 011-1H3zm1 0h4V3.5a2 2 0 10-4 0V5z"
            fill="currentColor"
          />
        </svg>
        100 % gratis & unverbindlich · jederzeit abbestellbar
      </p>

      {state === "error" && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {message}
        </p>
      )}
    </form>
  );
}
