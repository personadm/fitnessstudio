import Link from "next/link";
import { createFunnel } from "@/app/admin/_actions";

const TRIGGERS: { value: string; label: string; hint: string }[] = [
  {
    value: "INTERESSENT",
    label: "Interessent",
    hint: "Wird ausgelöst, sobald sich jemand auf der Landingpage einträgt.",
  },
  {
    value: "NEUKUNDE",
    label: "Neukunde",
    hint: "Wird ausgelöst, sobald jemand das Anmeldeformular abschickt — Onboarding.",
  },
  {
    value: "KUNDE",
    label: "Kunde",
    hint: "Wird ausgelöst, wenn du den Status auf Mitglied setzt — z.B. Welcome-Sequenz.",
  },
  {
    value: "EHEMALIGER",
    label: "Ehemaliger",
    hint: "Wird ausgelöst nach Kündigung — z.B. Win-Back-Sequenz.",
  },
];

export default function NewFunnelPage() {
  return (
    <div className="p-8 md:p-12">
      <Link
        href="/admin/funnels"
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
      >
        ← Zurück
      </Link>

      <div className="mt-6 mb-12">
        <p className="label">Neuer Funnel</p>
        <h1 className="mt-2 text-display text-5xl">Funnel anlegen</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted leading-relaxed">
          Lege erst Name und Auslöser fest. Schritte (Mails) fügst du danach auf der Detailseite
          hinzu.
        </p>
      </div>

      <form action={createFunnel} className="max-w-2xl space-y-8">
        <label className="block">
          <span className="label mb-2 block">Name</span>
          <input
            type="text"
            name="name"
            required
            placeholder="z.B. Win-Back nach Kündigung"
            className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
          />
          <span className="mt-1 block font-mono text-[11px] text-muted">
            Nur intern sichtbar — der User sieht nur die Mail-Inhalte.
          </span>
        </label>

        <fieldset>
          <legend className="label mb-4">Auslöser (Status-Wechsel)</legend>
          <div className="space-y-3">
            {TRIGGERS.map((t, i) => (
              <label
                key={t.value}
                className="block cursor-pointer border border-ink/15 p-4 hover:border-ink/40 has-[:checked]:border-ink has-[:checked]:bg-ink/5"
              >
                <input
                  type="radio"
                  name="trigger"
                  value={t.value}
                  required
                  defaultChecked={i === 3}
                  className="sr-only peer"
                />
                <div className="flex items-start gap-4">
                  <div className="font-mono text-xs uppercase tracking-[0.1em] text-muted peer-checked:text-acid_dark min-w-[100px]">
                    {t.label}
                  </div>
                  <p className="text-sm leading-relaxed">{t.hint}</p>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-3 border-t border-ink/15 pt-6">
          <label className="flex items-start gap-3 text-sm leading-relaxed cursor-pointer">
            <input type="checkbox" name="active" defaultChecked className="mt-0.5 h-4 w-4 accent-ink" />
            <div>
              <span className="font-medium">Aktiv</span>
              <p className="font-mono text-[11px] text-muted mt-0.5">
                Wenn aus: keine neuen Einschreibungen, laufende Schritte werden trotzdem versendet.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 text-sm leading-relaxed cursor-pointer">
            <input type="checkbox" name="autoStop" defaultChecked className="mt-0.5 h-4 w-4 accent-ink" />
            <div>
              <span className="font-medium">Auto-Stop bei Status-Wechsel</span>
              <p className="font-mono text-[11px] text-muted mt-0.5">
                Verlässt der Kontakt den Trigger-Status (z.B. Ehemaliger → Kunde), wird die Sequenz
                automatisch abgebrochen. Empfohlen.
              </p>
            </div>
          </label>
        </div>

        <div className="flex gap-3 border-t border-ink/15 pt-8">
          <button
            type="submit"
            className="bg-ink px-6 py-3 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
          >
            Anlegen &amp; Schritte hinzufügen →
          </button>
          <Link
            href="/admin/funnels"
            className="border border-ink/20 px-6 py-3 font-mono text-xs uppercase tracking-[0.12em] hover:bg-ink/5"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
