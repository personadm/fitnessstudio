"use client";

import { useEffect, useState, useTransition } from "react";
import { createClubContact, type ClubSignupResult } from "@/app/admin/_actions";

type Gender = "MAENNLICH" | "WEIBLICH" | "DIVERS";
type SignupMode = "OFFLINE" | "ONLINE";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  billingInterval: string;
  locationId: string | null;
};

type Loc = {
  id: string;
  name: string;
  city: string | null;
};

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

const BILLING_LABEL: Record<string, string> = {
  MONATLICH: "/ Monat",
  QUARTALSWEISE: "/ Quartal",
  HALBJAEHRLICH: "/ Halbjahr",
  JAEHRLICH: "/ Jahr",
  EINMALIG: "einmalig",
};

const STAFF_STORAGE_KEY = "club-signup-staff";

export function ClubSignupForm({ plans, locations }: { plans: Plan[]; locations: Loc[] }) {
  const [staff, setStaff] = useState("");
  const [signupMode, setSignupMode] = useState<SignupMode>("OFFLINE");
  const [gender, setGender] = useState<Gender | "">("");
  const [locationId, setLocationId] = useState<string>(locations[0]?.id ?? "");
  const filteredPlans = plans.filter(
    (p) => !p.locationId || p.locationId === locationId || !locationId,
  );
  const [pricingPlanId, setPricingPlanId] = useState<string>(filteredPlans[0]?.id ?? "");

  const [result, setResult] = useState<ClubSignupResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [pending, startTransition] = useTransition();

  // Mitarbeitername aus localStorage holen
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STAFF_STORAGE_KEY) : null;
    if (saved) setStaff(saved);
  }, []);

  // Wenn Standort wechselt → ersten passenden Plan auswählen
  useEffect(() => {
    const fp = plans.filter(
      (p) => !p.locationId || p.locationId === locationId || !locationId,
    );
    if (!fp.find((p) => p.id === pricingPlanId)) {
      setPricingPlanId(fp[0]?.id ?? "");
    }
  }, [locationId, plans, pricingPlanId]);

  const hasMultipleLocations = locations.length > 1;
  const canSubmit = !!staff.trim() && !!gender;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setErrorMsg("");
    setResult(null);

    const fd = new FormData(e.currentTarget);
    fd.set("staff", staff.trim());
    fd.set("signupMode", signupMode);
    if (gender) fd.set("gender", gender);

    // Speichere Mitarbeitername lokal für nächste Anmeldung
    localStorage.setItem(STAFF_STORAGE_KEY, staff.trim());

    startTransition(async () => {
      const r = await createClubContact(fd);
      if (r.ok) {
        setResult(r);
      } else {
        setErrorMsg(r.error);
      }
    });
  }

  function resetForNext() {
    setResult(null);
    setErrorMsg("");
    setGender("");
    // staff + signupMode + locationId beibehalten — meist gleiche Session
    const form = document.getElementById("club-signup-form") as HTMLFormElement | null;
    if (form) {
      // Felder leeren außer Mitarbeitername (der ist im React-State)
      form.querySelectorAll("input[type=text], input[type=email], input[type=tel], input[type=date], textarea").forEach(
        (el) => {
          const i = el as HTMLInputElement | HTMLTextAreaElement;
          if (i.name !== "staff") i.value = "";
        },
      );
    }
  }

  if (result?.ok) {
    return (
      <div className="border-2 p-8 bg-cream" style={{ borderColor: "#7CAE2D" }}>
        <p
          className="font-mono text-[11px] uppercase tracking-[0.14em] mb-3"
          style={{ color: "#7CAE2D" }}
        >
          ✓ Erfolgreich angelegt
        </p>
        <p className="text-display-italic text-3xl mb-2">
          {result.firstName} {result.lastName}
        </p>
        <p className="text-display text-base text-ink-soft mb-6">
          {result.existing
            ? "Bestehender Kontakt wurde auf Neukunde aktualisiert."
            : "Wurde als Neukunde angelegt."}
        </p>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={resetForNext}
            className="bg-ink text-cream px-6 py-3 font-mono text-xs uppercase tracking-[0.14em] hover:bg-ink/90"
          >
            Nächste Anmeldung
          </button>
          <a
            href={`/admin/contacts/${result.contactId}`}
            className="border border-ink px-6 py-3 font-mono text-xs uppercase tracking-[0.14em] hover:bg-ink/5"
          >
            Kontakt öffnen →
          </a>
        </div>
      </div>
    );
  }

  return (
    <form id="club-signup-form" onSubmit={handleSubmit} className="space-y-10">
      {/* ─── Mitarbeiter + Modus ─── */}
      <section className="border-t border-ink/15 pt-8">
        <p className="label mb-5">Anmeldung durch</p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field
            label="Mitarbeiter:in"
            name="staff"
            value={staff}
            onChange={setStaff}
            placeholder="Dein Name"
            required
          />
          <div>
            <span className="label mb-3 block">Anmeldungs-Art</span>
            <div className="flex gap-2">
              {(
                [
                  ["OFFLINE", "Im Club"],
                  ["ONLINE", "Online"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSignupMode(val)}
                  className={
                    "flex-1 border-2 py-3 font-mono text-xs uppercase tracking-[0.14em] " +
                    (signupMode === val
                      ? "bg-ink text-cream border-ink"
                      : "border-ink/30 text-ink hover:border-ink")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Person ─── */}
      <section className="border-t border-ink/15 pt-8">
        <p className="label mb-5">Person</p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <Field label="Vorname" name="firstName" required />
          <Field label="Nachname" name="lastName" required />
          <Field label="E-Mail" name="email" type="email" required />
          <Field label="Telefon" name="phone" type="tel" placeholder="Optional" />
          <Field
            label="Geburtsdatum"
            name="birthDate"
            type="date"
            placeholder="Optional"
          />
          <div>
            <span className="label mb-3 block">Geschlecht</span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["MAENNLICH", "Männlich"],
                  ["WEIBLICH", "Weiblich"],
                  ["DIVERS", "Divers"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setGender(val)}
                  className={
                    "border-2 py-3 font-mono text-xs uppercase tracking-[0.14em] " +
                    (gender === val
                      ? "bg-ink text-cream border-ink"
                      : "border-ink/30 text-ink hover:border-ink")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Adresse ─── */}
      <section className="border-t border-ink/15 pt-8">
        <p className="label mb-5">Adresse <span className="font-mono normal-case text-muted">(optional)</span></p>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
          <div className="md:col-span-3">
            <Field label="Straße & Nr." name="street" />
          </div>
          <Field label="PLZ" name="postalCode" />
          <div className="md:col-span-2">
            <Field label="Ort" name="city" />
          </div>
        </div>
      </section>

      {/* ─── Vertrag ─── */}
      <section className="border-t border-ink/15 pt-8">
        <p className="label mb-5">Vertrag <span className="font-mono normal-case text-muted">(optional)</span></p>

        {hasMultipleLocations && (
          <div className="mb-6">
            <span className="label mb-3 block">Standort</span>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setLocationId(loc.id)}
                  className={
                    "border-2 px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] " +
                    (locationId === loc.id
                      ? "bg-ink text-cream border-ink"
                      : "border-ink/30 text-ink hover:border-ink")
                  }
                >
                  {loc.name}
                  {loc.city ? ` · ${loc.city}` : ""}
                </button>
              ))}
            </div>
            <input type="hidden" name="locationId" value={locationId} />
          </div>
        )}

        <div className="mb-6">
          <span className="label mb-3 block">Tarif</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filteredPlans.length === 0 ? (
              <p className="text-sm text-muted col-span-2">Keine Tarife für diesen Standort.</p>
            ) : (
              filteredPlans.map((p) => {
                const selected = pricingPlanId === p.id;
                return (
                  <label
                    key={p.id}
                    className={
                      "cursor-pointer border-2 p-4 flex items-start gap-3 " +
                      (selected
                        ? "bg-ink text-cream border-ink"
                        : "border-ink/30 hover:border-ink")
                    }
                  >
                    <input
                      type="radio"
                      name="pricingPlanId"
                      value={p.id}
                      checked={selected}
                      onChange={() => setPricingPlanId(p.id)}
                      className="mt-1 accent-current"
                    />
                    <span className="flex-1">
                      <span className="block text-display text-lg leading-tight">{p.name}</span>
                      <span className="block font-mono text-xs mt-1 opacity-80">
                        {formatPrice(p.priceCents)} {BILLING_LABEL[p.billingInterval] ?? ""}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <Field label="Vertragsstart" name="contractStartDate" type="date" />
          <Field label="IBAN" name="iban" placeholder="DE89 …" />
        </div>
      </section>

      {/* ─── Notizen ─── */}
      <section className="border-t border-ink/15 pt-8">
        <p className="label mb-5">Notizen <span className="font-mono normal-case text-muted">(optional)</span></p>
        <textarea
          name="notes"
          rows={4}
          placeholder="Interne Notizen, Vereinbarungen, Hinweise …"
          className="w-full border-2 border-ink/30 bg-transparent p-3 text-sm outline-none focus:border-ink"
        />
      </section>

      {/* ─── Submit ─── */}
      <div className="border-t border-ink/15 pt-8">
        {errorMsg && (
          <p className="mb-4 border-2 border-red-700 bg-red-50 p-4 text-sm text-red-900">
            {errorMsg}
          </p>
        )}
        <button
          type="submit"
          disabled={!canSubmit || pending}
          className="bg-ink text-cream px-8 py-4 font-mono text-xs uppercase tracking-[0.14em] hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? "Wird angelegt …" : "Neukunde anlegen"}
        </button>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Status springt direkt auf Neukunde · keine Bestätigungs-Mail
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const controlled = onChange !== undefined;
  return (
    <label className="block">
      <span className="label mb-2 block">
        {label}
        {required && <span className="text-acid_dark"> *</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        {...(controlled
          ? { value, onChange: (e) => onChange?.(e.target.value) }
          : {})}
        className="w-full border-b-2 border-ink/30 bg-transparent py-2 text-base outline-none focus:border-ink"
      />
    </label>
  );
}
