"use client";

import { useState } from "react";

/**
 * Lead-Formular für eine Studio-Landingpage. Übergibt den Studio-Slug, damit
 * der Lead dem richtigen Mandanten zugeordnet wird (/api/leads).
 */
export function StudioLeadForm({
  studioSlug,
  ctaLabel,
  brandColor,
  onBrand,
}: {
  studioSlug: string;
  ctaLabel: string;
  brandColor: string;
  onBrand: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setMessage("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: fd.get("firstName"),
          lastName: fd.get("lastName"),
          email: fd.get("email"),
          studio: studioSlug,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setState("done");
        setMessage(
          data.alreadyConfirmed
            ? "Du bist schon eingetragen – schau in dein Postfach."
            : "Geschafft! Bitte bestätige die E-Mail in deinem Postfach.",
        );
      } else {
        setState("error");
        setMessage(data.message ?? "Etwas ist schiefgelaufen.");
      }
    } catch {
      setState("error");
      setMessage("Verbindung fehlgeschlagen.");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border-2 border-ink/15 bg-white/70 p-8 text-center">
        <p className="text-display text-2xl">Fast geschafft 🎉</p>
        <p className="mt-3 text-sm text-ink/70">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border-2 border-ink/15 bg-white/70 p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          name="firstName"
          required
          placeholder="Vorname"
          className="w-full border-b-2 border-ink/30 bg-transparent py-2 outline-none focus:border-ink"
        />
        <input
          name="lastName"
          placeholder="Nachname (optional)"
          className="w-full border-b-2 border-ink/30 bg-transparent py-2 outline-none focus:border-ink"
        />
      </div>
      <input
        type="email"
        name="email"
        required
        placeholder="E-Mail-Adresse"
        className="w-full border-b-2 border-ink/30 bg-transparent py-2 outline-none focus:border-ink"
      />
      {state === "error" && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "loading"}
        style={{ background: brandColor, color: onBrand }}
        className="w-full py-3.5 font-mono text-sm uppercase tracking-[0.14em] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {state === "loading" ? "Sende…" : ctaLabel}
      </button>
      <p className="text-center text-xs text-ink/45">
        Kostenlos & unverbindlich. Abmeldung jederzeit möglich.
      </p>
    </form>
  );
}
