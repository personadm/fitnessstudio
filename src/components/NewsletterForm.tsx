"use client";

import { useState } from "react";

type State = "idle" | "loading" | "success" | "error";

/**
 * Schlankes Anmelde-Formular für die Sonntags-Newsletter-Landingpage.
 *  - Vorname (required)
 *  - E-Mail (required)
 *  - DSGVO-Consent (required)
 *
 * Postet an /api/newsletter (Single-Opt-In, legt newsletterOnly-Kontakt an und
 * trägt ihn in die Sonntags-Newsletter-Liste ein).
 */
export function NewsletterForm() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstName, email, consent }),
      });
      const data = await res.json();

      if (data.ok) {
        setState("success");
        setMessage(data.message ?? "Geschafft! Ab Sonntag bist du dabei.");
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
      <div className="border border-acid/40 bg-ink p-8 text-cream">
        <p className="label !text-acid mb-4">✓ Eingetragen</p>
        <h3 className="text-display text-3xl leading-tight md:text-4xl">
          Schön, dass du dabei bist.
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-cream/80">{message}</p>
      </div>
    );
  }

  const canSubmit = consent && firstName.trim() && email.trim();

  return (
    <form
      onSubmit={onSubmit}
      id="anmelden"
      className="border border-ink/15 bg-cream p-6 shadow-[6px_6px_0_0_#1A1815] md:p-8"
    >
      <p className="label mb-2">Kostenlos · jeden Sonntag</p>
      <h3 className="text-display text-3xl leading-[0.95] md:text-4xl">
        Sei ab Sonntag dabei.
      </h3>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="label mb-1.5 block">Vorname</span>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Wie heißt du?"
            className="w-full border border-ink/20 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-acid"
          />
        </label>

        <label className="block">
          <span className="label mb-1.5 block">E-Mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deine@email.de"
            className="w-full border border-ink/20 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-ink focus:ring-2 focus:ring-acid"
          />
        </label>

        <label className="flex cursor-pointer items-start gap-3 pt-1">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-5 w-5 flex-shrink-0 accent-ink"
          />
          <span className="text-sm leading-snug text-ink-soft">
            Ja, schickt mir den kostenlosen Sonntags-Newsletter. Abmelden kann
            ich mich jederzeit mit einem Klick.
          </span>
        </label>
      </div>

      {state === "error" && (
        <p className="mt-4 text-sm font-medium text-red-700">{message}</p>
      )}

      <button
        type="submit"
        disabled={!canSubmit || state === "loading"}
        className="mt-6 w-full bg-ink px-6 py-4 font-mono text-xs uppercase tracking-[0.14em] text-acid transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        {state === "loading" ? "Wird eingetragen …" : "Newsletter abonnieren →"}
      </button>

      <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        Kein Spam · jederzeit abbestellbar
      </p>
    </form>
  );
}
