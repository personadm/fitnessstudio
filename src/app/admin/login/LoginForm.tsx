"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: fd.get("email"),
          password: fd.get("password"),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        // Open-Redirect-Schutz: nur interne Admin-Pfade zulassen.
        const safeTarget =
          redirectTo.startsWith("/admin") && !redirectTo.startsWith("//")
            ? redirectTo
            : "/admin";
        router.push(safeTarget);
        router.refresh();
      } else {
        setState("error");
        setErrorMsg(data.message ?? "Login fehlgeschlagen.");
      }
    } catch {
      setState("error");
      setErrorMsg("Verbindung fehlgeschlagen.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <label className="block">
        <span className="label mb-2 block">E-Mail</span>
        <input
          type="email"
          name="email"
          required
          autoFocus
          className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
        />
      </label>
      <label className="block">
        <span className="label mb-2 block">Passwort</span>
        <input
          type="password"
          name="password"
          required
          className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
        />
      </label>

      {state === "error" && (
        <p role="alert" className="text-sm text-red-700">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={state === "loading"}
        className="w-full bg-ink py-3 text-acid disabled:opacity-50 hover:bg-ink-soft"
      >
        <span className="font-mono text-sm uppercase tracking-[0.14em]">
          {state === "loading" ? "Prüfe…" : "Login →"}
        </span>
      </button>
    </form>
  );
}
