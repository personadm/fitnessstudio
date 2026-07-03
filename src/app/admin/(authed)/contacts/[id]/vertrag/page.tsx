import Link from "next/link";
import { db } from "@/lib/db";
import { PrintButton } from "./PrintButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

const PETROL = "#0F6E56";

// Statische Anbieter-Daten je Location-Name (USt-IdNr, HRB).
// Falls weitere Studios dazukommen → hier ergänzen.
const ANBIETER_DETAILS: Record<string, { ustId: string; hrb: string; geschaeftsfuehrer: string }> = {
  "Vital-Fit": {
    ustId: "DE 313 650 908",
    hrb: "Steinfurt HRB 11713",
    geschaeftsfuehrer: "Erik Bodon",
  },
  "Villa-Fit": {
    ustId: "—",
    hrb: "—",
    geschaeftsfuehrer: "Erik Bodon",
  },
};

const MAIL = "mail@gesundheitscoaches.de";

// Nach Ablauf der Kündigungsfrist geht das 6-Wochen-Programm automatisch in eine
// 12-monatige Clubmitgliedschaft über. Preis & Frist zentral hier pflegen.
const CLUB_MONTHLY_PRICE = "59,99 €";
const KUENDIGUNGSFRIST_WOCHEN = 5;

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("de-DE");
}

function addWeeks(date: Date, weeks: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + weeks * 7);
  return copy;
}

export const dynamic = "force-dynamic";

export default async function VertragPage({ params }: PageProps) {
  const { id } = await params;

  const contact = await db.contact.findFirst({
    where: { id },
    include: {
      location: true,
      pricingPlan: true,
    },
  });

  if (!contact) {
    return (
      <main className="grid min-h-screen place-items-center bg-white p-6">
        <p className="text-sm text-gray-500">Kunde nicht gefunden.</p>
      </main>
    );
  }

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  const fullAddress = [contact.street, [contact.postalCode, contact.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const birthDate = contact.birthDate
    ? new Date(contact.birthDate).toLocaleDateString("de-DE")
    : "";

  const location = contact.location;
  const locationName = location?.name ?? "Studio";
  const anbieter = ANBIETER_DETAILS[locationName] ?? {
    ustId: "—",
    hrb: "—",
    geschaeftsfuehrer: "Erik Bodon",
  };

  const today = new Date().toLocaleDateString("de-DE");

  // Startdatum des 6-Wochen-Programms = Zeitpunkt der Online-Anmeldung.
  // signupAt wird beim Absenden des Online-Formulars gesetzt; contractStartDate
  // dient als Fallback für manuell/offline angelegte Verträge.
  const anmeldungDate = contact.signupAt ?? contact.contractStartDate ?? null;
  const anmeldungLabel = anmeldungDate ? formatDate(anmeldungDate) : "__________";
  const kuendigungBisLabel = anmeldungDate
    ? formatDate(addWeeks(anmeldungDate, KUENDIGUNGSFRIST_WOCHEN))
    : "__________";

  const plan = contact.pricingPlan;
  const price = plan ? (plan.priceCents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "—";
  const billingLabel = plan
    ? {
        MONATLICH: "pro Monat",
        QUARTALSWEISE: "pro Quartal",
        HALBJAEHRLICH: "pro Halbjahr",
        JAEHRLICH: "pro Jahr",
        EINMALIG: "einmalig",
      }[plan.billingInterval] ?? ""
    : "";

  return (
    <>
      <PrintStyles />
      {/* Navigation – wird beim Drucken ausgeblendet */}
      <div className="no-print sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href={`/admin/contacts/${contact.id}`} className="text-sm text-gray-600 hover:text-gray-900">
            ← Zurück zum Kontakt
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* Druck-Bereich */}
      <main className="print-area mx-auto max-w-3xl bg-white px-10 py-12 text-sm leading-relaxed text-black md:px-16">
        {/* ── Seite 1: Vertrag ── */}
        <header className="mb-8 border-b border-black/10 pb-6">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">Anbieter</p>
          <h1 className="mt-1 text-xl font-bold">{locationName} GmbH</h1>
          <p className="mt-1">
            {location?.street ?? ""}
            <br />
            {location?.postalCode ?? ""} {location?.city ?? ""}
            <br />
            {location?.phone ? `Telefon: ${location.phone}` : null}
            {location?.email ? (
              <>
                <br />
                E-Mail: {location.email}
              </>
            ) : null}
          </p>
          <p className="mt-3 text-xs text-gray-600">
            Geschäftsführer: {anbieter.geschaeftsfuehrer} · USt-IdNr.: {anbieter.ustId} · HRB:{" "}
            {anbieter.hrb}
          </p>
        </header>

        <section className="mb-8">
          <h2 className="text-base font-bold uppercase tracking-wider" style={{ color: PETROL }}>
            Mitgliedschaftsvereinbarung
          </h2>
          <p className="mt-2 text-xs text-gray-600">Vertragsnummer: {contact.id.slice(-8).toUpperCase()}</p>
        </section>

        <section className="mb-8">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider">Vertragspartner</h3>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Name" value={fullName} />
              <Row label="Anschrift" value={fullAddress} />
              <Row label="Geburtsdatum" value={birthDate} />
              <Row label="E-Mail" value={contact.email} />
              <Row label="Telefon" value={contact.phone ?? ""} />
            </tbody>
          </table>
        </section>

        <section className="mb-8">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider">Tarif & Konditionen</h3>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Tarif" value={plan?.name ?? "—"} />
              <Row label="Preis" value={`${price} ${billingLabel}`} />
              <Row
                label="Programmstart"
                value={anmeldungDate ? anmeldungLabel : "mit deiner Online-Anmeldung"}
              />
              <Row label="Studio" value={locationName} />
            </tbody>
          </table>
          {plan?.description ? (
            <p className="mt-3 text-xs italic text-gray-700">{plan.description}</p>
          ) : null}
        </section>

        {/* Rechtlich zentrale Bedingungen — bewusst als klar lesbarer Kasten,
            ersetzt die frühere Zeile „VERTRAGSBEGINN ab Datum der Unterschrift". */}
        <section className="mb-8">
          <div className="rounded-md border-2 border-black/70 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider" style={{ color: PETROL }}>
              Programmlaufzeit &amp; Kündigung
            </h3>
            <ul className="ml-4 list-disc space-y-2 text-sm leading-relaxed text-black">
              <li>
                Das 6-Wochen-Programm startet exakt mit deiner Online-Anmeldung am{" "}
                <strong>{anmeldungLabel}</strong>.
              </li>
              <li>
                <strong style={{ color: PETROL }}>Zufriedenheitsgarantie:</strong> Sollte das
                Programm nicht spätestens bis zum <strong>{kuendigungBisLabel}</strong> schriftlich
                gekündigt werden, geht es in eine 12-monatige Clubmitgliedschaft zu monatlich{" "}
                <strong>{CLUB_MONTHLY_PRICE}</strong> über.
              </li>
              <li>
                Mit der Unterschrift erlischt auch das Rücktrittsrecht aus der Online-Anmeldung
                aufgrund der Inanspruchnahme der Leistung.
              </li>
            </ul>
            <p className="mt-3 text-xs text-gray-700">
              Die AGB sowie die Programm-Inhalte aus der Online-Anmeldung sind Bestandteil dieses
              Programms.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider">Bankverbindung (SEPA-Lastschriftmandat)</h3>
          <p className="mb-3 text-xs text-gray-700">
            Ich ermächtige {locationName} GmbH widerruflich, die Beiträge bei Fälligkeit von meinem Konto
            mittels Lastschrift einzuziehen. Zugleich weise ich mein Kreditinstitut an, die von{" "}
            {locationName} GmbH auf mein Konto gezogenen Lastschriften einzulösen.
          </p>
          <table className="w-full text-sm">
            <tbody>
              <Row
                label="IBAN"
                value={contact.iban ?? "______________________________"}
                emptyLine={!contact.iban}
              />
              <Row label="Kontoinhaber" value={contact.iban ? fullName : "______________________________"} />
              <Row label="Kreditinstitut" value="______________________________" />
              <Row label="BIC" value="______________________________" />
            </tbody>
          </table>
        </section>

        <section className="mb-8">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider">Hinweise</h3>
          <ul className="ml-4 list-disc space-y-1 text-xs text-gray-700">
            <li>Es gelten die AGB aus der Online-Anmeldung.</li>
            <li>
              Die gesetzlichen Krankenkassen erstatten je nach Tarif einen Großteil der Kursgebühren.
              Eine Teilnahmebescheinigung erhältst du nach vollständiger Absolvierung des digitalen
              Online-Ernährungscoachings.
            </li>
            <li>
              Datenverarbeitung gemäß Datenschutzerklärung. Kontakt jederzeit unter{" "}
              <span className="underline">{MAIL}</span>.
            </li>
          </ul>
        </section>

        <section className="mt-12">
          <div className="grid grid-cols-2 gap-12">
            <SignatureField label="Ort, Datum" value={`Ahaus / Ochtrup, ${today}`} />
            <SignatureField label="Unterschrift Anbieter" />
          </div>
          <div className="mt-10 grid grid-cols-2 gap-12">
            <SignatureField label="Ort, Datum" />
            <SignatureField label="Unterschrift Kunde" />
          </div>
        </section>
      </main>
    </>
  );
}

function Row({ label, value, emptyLine }: { label: string; value: string; emptyLine?: boolean }) {
  return (
    <tr className="align-top">
      <th className="w-40 py-1 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </th>
      <td className={`py-1 ${emptyLine ? "font-mono tracking-widest text-gray-400" : ""}`}>
        {value}
      </td>
    </tr>
  );
}

function SignatureField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="h-12 border-b border-black">
        {value ? <span className="inline-block pt-3 text-sm">{value}</span> : null}
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
    </div>
  );
}

function PrintStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@media print {
  /* Schritt 1: Wirklich ALLES verstecken (auch das Admin-Layout drumherum:
     Sidebar mit Kontakte/Standorte/Tarife, Top-Header etc.) */
  body * {
    visibility: hidden !important;
  }

  /* Schritt 2: Nur die Vertrags-Druckbereich plus seine Kinder wieder sichtbar */
  .print-area,
  .print-area * {
    visibility: visible !important;
  }

  /* Schritt 3: Druckbereich an den oberen Seitenrand setzen — sonst hätte er
     den vertikalen Platz, den die versteckte Sidebar früher gebraucht hat */
  .print-area {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  /* Schritt 4: no-print explizit weg (z.B. der Drucken-Button selbst) */
  .no-print {
    display: none !important;
  }

  body {
    background: #fff !important;
  }

  /* Tabellen-Zeilen + Überschriften nicht mitten zerreißen */
  tr, h3, h4 {
    page-break-inside: avoid;
  }
}

@page {
  size: A4;
  margin: 18mm 16mm;
}
        `,
      }}
    />
  );
}
