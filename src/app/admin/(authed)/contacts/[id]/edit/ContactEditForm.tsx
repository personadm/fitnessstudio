"use client";

import { useActionState, useEffect, useRef, startTransition } from "react";
import Link from "next/link";
import { updateContactData, type ContactEditState } from "@/app/admin/_actions";
import {
  ORIGINAL_VALUES_FIELD,
  type ContactEditField,
  type ContactFormValues,
} from "@/lib/contact-edit-fields";

type Option = { id: string; label: string };

type Props = {
  contactId: string;
  isDoiConfirmed: boolean;
  initial: ContactFormValues;
  locations: Option[];
  plans: Option[];
};

const GENDER_OPTIONS = [
  { id: "MAENNLICH", label: "Männlich" },
  { id: "WEIBLICH", label: "Weiblich" },
  { id: "DIVERS", label: "Divers" },
];

const INPUT_CLASS =
  "w-full border-b-2 bg-transparent py-2 text-base outline-none transition-colors focus:border-ink aria-[invalid=true]:border-red-700";

/**
 * Formular zum Bearbeiten der Stamm- & Vertragsdaten eines Kontakts.
 * Felder sind unkontrolliert (defaultValue). Die Action wird bewusst manuell
 * aus onSubmit dispatcht: React 19 setzt Formulare mit `action={…}` nach jedem
 * Durchlauf zurück — bei Validierungsfehlern wären die Eingaben sonst weg.
 * Die Ausgangswerte gehen als Hidden-Feld mit, damit der Server nur wirklich
 * veränderte Felder prüft und schreibt. Bei Erfolg leitet die Server-Action
 * zurück auf die Kontaktseite.
 */
export function ContactEditForm({ contactId, isDoiConfirmed, initial, locations, plans }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const [state, formAction, isPending] = useActionState<ContactEditState, FormData>(
    updateContactData.bind(null, contactId),
    null,
  );
  const errors = state?.fieldErrors ?? {};

  // Nach fehlgeschlagenem Speichern: erstes fehlerhaftes Feld (sonst die
  // Fehlermeldung) in den sichtbaren Bereich holen und fokussieren — auf dem
  // Handy steht man beim Speichern sonst weit unterhalb der Meldung.
  useEffect(() => {
    if (!state) return;
    const firstInvalid = Object.keys(state.fieldErrors)[0];
    const target = firstInvalid
      ? formRef.current?.elements.namedItem(firstInvalid)
      : alertRef.current;
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.focus({ preventScroll: true });
    }
  }, [state]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    // Halb eingetipptes/unmögliches Datum (z. B. 31.02.) liefert dem Browser
    // einen leeren Wert — das darf nicht als "Datum löschen" gespeichert werden.
    const badDate = Array.from(
      form.querySelectorAll<HTMLInputElement>('input[type="date"]'),
    ).find((el) => el.validity.badInput);
    if (badDate) {
      badDate.reportValidity();
      badDate.focus();
      return;
    }
    const formData = new FormData(form);
    startTransition(() => formAction(formData));
  }

  const field = (name: ContactEditField) => ({
    name,
    defaultValue: initial[name],
    error: errors[name],
  });

  return (
    <form
      ref={formRef}
      // POST: Falls vor dem Laden von JS abgeschickt wird, landen IBAN & Co.
      // nicht als Query-String in URL, Verlauf oder Server-Logs.
      method="post"
      onSubmit={handleSubmit}
      noValidate
      className="max-w-3xl space-y-10 pb-28 md:pb-0"
    >
      <input type="hidden" name={ORIGINAL_VALUES_FIELD} value={JSON.stringify(initial)} />

      {state?.error && (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="scroll-mt-20 border-l-4 border-red-700 bg-red-50 p-4 text-sm text-red-800 outline-none"
        >
          {state.error}
        </div>
      )}

      {/* ─── Person ─── */}
      <section className="border-t border-ink/15 pt-8">
        <p className="label mb-5">Person</p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <TextField label="Vorname" autoComplete="off" {...field("firstName")} />
          <TextField label="Nachname" autoComplete="off" {...field("lastName")} />
          <div className="md:col-span-2">
            <TextField
              label="E-Mail"
              type="email"
              required
              autoComplete="off"
              inputMode="email"
              hint={`Künftige Mails gehen an die neue Adresse${
                isDoiConfirmed ? "; die DOI-Bestätigung bleibt bestehen" : ""
              }. Nur zur Korrektur derselben Person verwenden (z. B. Tippfehler). Links aus früheren Mails an die alte Adresse funktionieren danach nicht mehr; bereits abgebrochene Funnels starten nicht neu.`}
              {...field("email")}
            />
          </div>
          <TextField label="Telefon" type="tel" autoComplete="off" {...field("phone")} />
          <TextField label="Geburtsdatum" type="date" {...field("birthDate")} />
          <SelectField
            label="Geschlecht"
            emptyLabel="— keine Angabe —"
            options={GENDER_OPTIONS}
            {...field("gender")}
          />
        </div>
      </section>

      {/* ─── Adresse ─── */}
      <section className="border-t border-ink/15 pt-8">
        <p className="label mb-5">Adresse</p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
          <div className="md:col-span-3">
            <TextField label="Straße & Nr." autoComplete="off" {...field("street")} />
          </div>
          <TextField label="PLZ" inputMode="numeric" autoComplete="off" {...field("postalCode")} />
          <div className="md:col-span-2">
            <TextField label="Ort" autoComplete="off" {...field("city")} />
          </div>
        </div>
      </section>

      {/* ─── Standort & Vertrag ─── */}
      <section className="border-t border-ink/15 pt-8">
        <p className="label mb-5">Standort &amp; Vertrag</p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <SelectField
            label="Standort"
            emptyLabel="— kein Standort —"
            options={locations}
            {...field("locationId")}
          />
          <SelectField
            label="Tarif"
            emptyLabel="— kein Tarif —"
            options={plans}
            {...field("pricingPlanId")}
          />
          <div className="md:col-span-2">
            <TextField
              label="IBAN"
              mono
              autoComplete="off"
              spellCheck={false}
              hint="Leerzeichen sind egal — wird beim Speichern geprüft (Prüfziffer)."
              {...field("iban")}
            />
          </div>
          <TextField label="Vertragsstart" type="date" {...field("contractStartDate")} />
          <div className="hidden md:block" aria-hidden />
          <TextField label="Mitglied seit" type="date" {...field("memberSince")} />
          <TextField label="Mitglied bis" type="date" {...field("memberUntil")} />
        </div>
      </section>

      {/* ─── Aktionen: mobil fest am unteren Bildschirmrand (sticky greift im
          Admin-Layout nicht, weil <main> overflow-auto hat), Desktop normal. ─── */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/15 bg-cream px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:static md:z-auto md:border-0 md:p-0">
        {state?.error && (
          <p className="mb-2 text-xs text-red-700 md:hidden" aria-hidden>
            {state.error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-ink px-6 py-3 font-mono text-xs uppercase tracking-[0.14em] text-cream transition-colors hover:bg-ink/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:opacity-60 md:flex-none"
          >
            {isPending ? "Speichert…" : "Speichern"}
          </button>
          <Link
            href={`/admin/contacts/${contactId}`}
            className="border border-ink/30 px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] hover:border-ink hover:bg-ink/5"
          >
            Abbrechen
          </Link>
        </div>
      </div>
    </form>
  );
}

type BaseFieldProps = {
  label: string;
  name: ContactEditField;
  defaultValue: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

function FieldShell({
  label,
  name,
  error,
  hint,
  required,
  children,
}: Omit<BaseFieldProps, "defaultValue"> & { children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className="label mb-2 block">
        {label}
        {required && <span className="text-acid_dark"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`f-${name}-error`} className="mt-1.5 text-xs text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`f-${name}-hint`} className="mt-1.5 text-xs leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(name: string, error?: string, hint?: string) {
  if (error) return `f-${name}-error`;
  if (hint) return `f-${name}-hint`;
  return undefined;
}

function TextField({
  type = "text",
  mono,
  autoComplete,
  inputMode,
  spellCheck,
  ...props
}: BaseFieldProps & {
  type?: string;
  mono?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  spellCheck?: boolean;
}) {
  const { name, defaultValue, error, hint, required } = props;
  return (
    <FieldShell {...props}>
      <input
        id={`f-${name}`}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        spellCheck={spellCheck}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={`${INPUT_CLASS} ${error ? "border-red-700" : "border-ink/30"} ${mono ? "font-mono" : ""}`}
      />
    </FieldShell>
  );
}

function SelectField({
  options,
  emptyLabel,
  ...props
}: BaseFieldProps & { options: Option[]; emptyLabel: string }) {
  const { name, defaultValue, error, hint } = props;
  return (
    <FieldShell {...props}>
      <select
        id={`f-${name}`}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        className={`${INPUT_CLASS} ${error ? "border-red-700" : "border-ink/30"}`}
      >
        <option value="">{emptyLabel}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
