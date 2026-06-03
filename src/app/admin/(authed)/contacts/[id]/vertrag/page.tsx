import Link from "next/link";
import { db } from "@/lib/db";

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

export const dynamic = "force-dynamic";

export default async function VertragPage({ params }: PageProps) {
  const { id } = await params;

  const contact = await db.contact.findUnique({
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
          <button
            type="button"
            onClick={() => (typeof window !== "undefined" ? window.print() : null)}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: PETROL }}
          >
            🖨 Vertrag drucken
          </button>
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
                label="Vertragsbeginn"
                value={
                  contact.contractStartDate
                    ? new Date(contact.contractStartDate).toLocaleDateString("de-DE")
                    : "ab Datum der Unterschrift"
                }
              />
              <Row label="Studio" value={locationName} />
            </tbody>
          </table>
          {plan?.description ? (
            <p className="mt-3 text-xs italic text-gray-700">{plan.description}</p>
          ) : null}
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
            <li>Die im Anhang beigefügten AGB sind Bestandteil dieses Vertrags.</li>
            <li>
              Die gesetzlichen Krankenkassen erstatten je nach Tarif einen Großteil der Kursgebühren.
              Eine Teilnahmebescheinigung erhältst du nach Programmabschluss.
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

        {/* ── Seite 2 ff.: AGB-Anhang ── */}
        <section className="agb-page mt-16">
          <h2 className="text-base font-bold uppercase tracking-wider" style={{ color: PETROL }}>
            Anhang: Allgemeine Geschäftsbedingungen
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            Stand 07.05.2026 · Bestandteil des oben geschlossenen Vertrags
          </p>
          <AGBText locationName={locationName} />
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

function AGBText({ locationName }: { locationName: string }) {
  // Verkürzte, druckfreundliche AGB-Version aus deinen aktuellen AGB-PDFs.
  // Bei Änderungen in /agb bitte hier ebenfalls anpassen ODER (besser):
  // die AGB einmal in eine Konstante extrahieren und an beiden Stellen einbinden.
  const items = [
    {
      heading: "1. Geltungsbereich",
      paragraphs: [
        `Für die Geschäftsbeziehung zwischen ${locationName} GmbH (nachfolgend „Verkäufer") und dem Kunden (nachfolgend „Kunde") gelten ausschließlich die nachfolgenden Allgemeinen Geschäftsbedingungen in ihrer zum Zeitpunkt der Bestellung gültigen Fassung.`,
        `Sie können uns persönlich für Fragen, Reklamationen und Beanstandungen per E-Mail unter ${MAIL} kontaktieren.`,
        "Verbraucher im Sinne dieser AGB ist jede natürliche Person, die ein Rechtsgeschäft zu einem Zwecke abschließt, der überwiegend weder ihrer gewerblichen noch ihrer selbstständigen beruflichen Tätigkeit zugerechnet werden kann (§ 13 BGB).",
      ],
    },
    {
      heading: "2. Angebote und Leistungsbeschreibungen",
      paragraphs: [
        "Die Darstellung der Produkte im Online-Shop stellt kein rechtlich bindendes Angebot, sondern eine Aufforderung zur Abgabe einer Bestellung dar. Leistungsbeschreibungen auf den Websites des Verkäufers haben nicht den Charakter einer Zusicherung oder Garantie.",
        "Alle Angebote gelten „solange der Vorrat reicht", wenn nicht bei den Produkten etwas anderes vermerkt ist.",
      ],
    },
    {
      heading: "3. Bestellvorgang und Vertragsabschluss",
      paragraphs: [
        "Der Kunde kann aus dem Sortiment des Verkäufers Produkte unverbindlich auswählen. Nach Eingabe der persönlichen Daten gelangt der Kunde innerhalb des Buchungsprozesses zur Auswahl der Versandarten und der Festlegung der Zahlungsinformationen zum Abschluss des Bestellvorgangs.",
        "Über die Schaltfläche „Bestellung aufgeben" gibt der Kunde einen verbindlichen Antrag zum Kauf der ausgewählten Waren oder Dienstleistungen ab.",
        "Der Verkäufer schickt daraufhin dem Kunden eine automatische Empfangsbestätigung per E-Mail zu. Der Kaufvertrag kommt erst dann zustande, wenn der Verkäufer das bestellte Produkt innerhalb von 2 Tagen versendet, übergibt oder den Versand innerhalb von 2 Tagen mit einer zweiten E-Mail bestätigt hat.",
      ],
    },
    {
      heading: "4. Preise und Versandkosten",
      paragraphs: [
        "Alle Preise verstehen sich einschließlich der jeweils gültigen gesetzlichen Umsatzsteuer.",
        "Zusätzlich zu den angegebenen Preisen berechnet der Verkäufer für die Lieferung Versandkosten, die im Rahmen des Bestellvorgangs deutlich mitgeteilt werden.",
      ],
    },
    {
      heading: "5. Lieferung, Warenverfügbarkeit",
      paragraphs: [
        "Soweit Vorkasse vereinbart ist, erfolgt die Lieferung nach Eingang des Rechnungsbetrages.",
        "Sollte die Zustellung der Ware durch Verschulden des Käufers trotz dreimaligem Auslieferversuch scheitern, kann der Verkäufer vom Vertrag zurücktreten.",
      ],
    },
    {
      heading: "6. Zahlungsmodalitäten",
      paragraphs: [
        "Der Kunde kann im Rahmen und vor Abschluss des Bestellvorgangs aus den zur Verfügung stehenden Zahlungsarten wählen.",
        "Ist die Bezahlung per Rechnung möglich, hat die Zahlung innerhalb von 15 Tagen nach Erhalt der Ware und der Rechnung zu erfolgen. Bei allen anderen Zahlweisen hat die Zahlung im Voraus ohne Abzug zu erfolgen.",
        "Werden Drittanbieter mit der Zahlungsabwicklung beauftragt (z.B. PayPal), gelten deren Allgemeine Geschäftsbedingungen.",
      ],
    },
    {
      heading: "7. Eigentumsvorbehalt",
      paragraphs: [
        "Bis zur vollständigen Bezahlung verbleiben die gelieferten Waren im Eigentum des Verkäufers.",
      ],
    },
    {
      heading: "8. Sachmängelgewährleistung und Garantie",
      paragraphs: [
        "Die Gewährleistung bestimmt sich nach gesetzlichen Vorschriften.",
        "Eine Garantie besteht bei den vom Verkäufer gelieferten Waren nur, wenn diese ausdrücklich abgegeben wurde.",
      ],
    },
    {
      heading: "9. Weitergehende Haftung",
      paragraphs: [
        "Schadenersatzansprüche gegen den Verkäufer aus Unmöglichkeit der Leistung, aus positiver Vertragsverletzung, aus Verschulden bei Vertragsabschluss und aus unerlaubter Handlung sind ausgeschlossen, soweit nicht vorsätzliches oder grob fahrlässiges Handeln vorliegt.",
        "Diese Haftungsbeschränkungen gelten nicht bei Verletzung des Lebens, des Körpers oder der Gesundheit.",
      ],
    },
    {
      heading: "10. Speicherung des Vertragstextes",
      paragraphs: [
        "Der Verkäufer sendet dem Kunden eine Bestellbestätigung mit allen Bestelldaten an die angegebene E-Mail-Adresse zu.",
        "Mit der Bestellbestätigung, spätestens jedoch bei der Lieferung der Ware, erhält der Kunde eine Kopie der AGB nebst Widerrufsbelehrung und den Hinweisen zu Versandkosten sowie Liefer- und Zahlungsbedingungen.",
      ],
    },
    {
      heading: "11. Schlussbestimmungen",
      paragraphs: [
        "Ist der Besteller Vollkaufmann, ist der Gerichtsstand und Erfüllungsort Ahaus.",
        "Sollte eine Bestimmung dieser Geschäftsbedingungen unwirksam sein, so wird dadurch die Gültigkeit der übrigen Bestimmungen nicht berührt.",
        "Auf alle Rechtsbeziehungen und Ansprüche zwischen Bestellern und des Verkäufers ist, soweit gesetzlich zulässig, ausschließlich deutsches Recht anwendbar.",
      ],
    },
  ];

  return (
    <div className="mt-4 space-y-4 text-xs leading-snug text-gray-800">
      {items.map((item) => (
        <div key={item.heading}>
          <h4 className="font-semibold text-black">{item.heading}</h4>
          {item.paragraphs.map((p, i) => (
            <p key={i} className="mt-1">
              {p}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function PrintStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@media print {
  .no-print { display: none !important; }
  body { background: #fff !important; }
  .print-area { padding: 0 !important; max-width: 100% !important; }
  .agb-page { page-break-before: always; }
  /* Tabellen-Zeilen nicht über Seitenumbruch brechen */
  tr, h3, h4 { page-break-inside: avoid; }
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
