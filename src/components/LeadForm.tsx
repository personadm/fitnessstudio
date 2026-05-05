"use client";

import { useState } from "react";

type State = "idle" | "loading" | "success" | "error";

export function LeadForm() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMessage("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, consent }),
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
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl">
      <label className="label block mb-3" htmlFor="email">
        E-Mail-Adresse
      </label>
      <div className="flex border-b-2 border-ink">
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="dein.name@beispiel.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === "loading"}
          className="flex-1 bg-transparent py-3 text-lg outline-none placeholder:text-muted disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={state === "loading" || !consent}
          className="group ml-2 bg-ink px-6 py-3 text-acid disabled:bg-ink/40 disabled:text-cream disabled:cursor-not-allowed transition-all hover:bg-ink-soft"
        >
          <span className="font-mono text-xs uppercase tracking-[0.12em]">
            {state === "loading" ? "Sendet…" : "Tarife senden"}
          </span>
          <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
        </button>
      </div>

      <label className="mt-5 flex items-start gap-3 text-xs leading-relaxed text-ink-soft cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-ink"
          required
        />
        <span>
          Ich willige ein, dass meine E-Mail-Adresse zur Zusendung der Tarife verarbeitet wird. Widerruf jederzeit per
          Klick auf den Abmelde-Link in jeder Mail. Mehr in der{" "}
          <a href="/datenschutz" className="underline underline-offset-2 hover:text-ink">
            Datenschutzerklärung
          </a>
          .
        </span>
      </label>

      {state === "error" && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {message}
        </p>
      )}
    </form>
  );
}
