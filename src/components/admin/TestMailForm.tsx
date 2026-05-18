"use client";

import { useState } from "react";

interface Props {
  stepId: string;
}

type State = "idle" | "sending" | "sent" | "error";

/**
 * Inline-Form um eine Testmail eines Funnel-Schritts an eine beliebige Adresse
 * zu schicken. Speichert die letzte verwendete E-Mail im localStorage, damit
 * man beim Testen mehrerer Schritte nicht jedes Mal die Adresse neu tippt.
 */
export function TestMailForm({ stepId }: Props) {
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem("funnel_test_email") ?? "";
    } catch {
      return "";
    }
  });
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) {
      setState("error");
      setMessage("Bitte E-Mail-Adresse eingeben.");
      return;
    }

    setState("sending");
    setMessage("");

    try {
      const res = await fetch("/api/admin/funnel-steps/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stepId, email: email.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };

      if (res.ok && data.ok) {
        setState("sent");
        setMessage(data.message ?? "Mail geschickt.");
        try {
          localStorage.setItem("funnel_test_email", email.trim());
        } catch {
          // egal
        }
        // Nach 4 Sekunden Status-Reset
        setTimeout(() => setState("idle"), 4000);
      } else {
        setState("error");
        setMessage(data.message ?? "Versand fehlgeschlagen.");
      }
    } catch {
      setState("error");
      setMessage("Netzwerkfehler. Versuch's nochmal.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 border-t border-ink/10 pt-4">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        Testmail senden
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "idle") setState("idle");
          }}
          placeholder="deine@email.de"
          disabled={state === "sending"}
          className="flex-1 border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={state === "sending" || !email.trim()}
          className="bg-ink px-4 py-2 text-acid hover:bg-ink-soft disabled:opacity-50"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
            {state === "sending" ? "Wird gesendet…" : "Test senden →"}
          </span>
        </button>
      </div>

      {state === "sent" && (
        <p className="mt-2 text-xs text-green-700">✓ {message}</p>
      )}
      {state === "error" && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {message}
        </p>
      )}
      {state === "idle" && (
        <p className="mt-2 text-[11px] text-muted">
          Mail geht ohne Funnel-Trigger raus. Platzhalter werden mit „Test"-Werten ersetzt.
        </p>
      )}
    </form>
  );
}
