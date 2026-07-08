// ─────────────────────────────────────────────────────────────
// Rechtstexte (zentrale Quelle) — Dienstleistungs-AGB + Widerrufsbelehrung
//
// Diese Texte sind rechtlich abgestimmt (Stand: Freigabe). Sie werden an drei
// Stellen identisch verwendet, deshalb liegen sie hier zentral (DRY):
//   1. AGB-Seite            → src/app/agb/page.tsx
//   2. Bestätigungsmail     → src/lib/mail.ts (dauerhafter Datenträger)
//   3. Vertrags-PDF Seite 2 → src/app/admin/(authed)/contacts/[id]/vertrag/page.tsx
//
// WICHTIG: Firma + Anschrift des Anbieters dürfen in der Widerrufsbelehrung nie
// weggelassen werden — anbieterForLocation() liefert daher immer einen
// vollständigen Datensatz (Fallback = Hauptstandort Ochtrup).
// ─────────────────────────────────────────────────────────────

export interface Anbieter {
  company: string; // "Vital-Fit GmbH"
  street: string; // "Laurenzstr. 98"
  postalCode: string; // "48607"
  city: string; // "Ochtrup"
}

export const LEGAL_MAIL = "mail@gesundheitscoaches.de";

// Studioabhängige GmbH-Daten. Schlüssel = Location.name (wie in der DB).
const ANBIETER_BY_LOCATION: Record<string, Anbieter> = {
  "Vital-Fit": {
    company: "Vital-Fit GmbH",
    street: "Laurenzstr. 98",
    postalCode: "48607",
    city: "Ochtrup",
  },
  "Villa-Fit": {
    company: "Villa-Fit GmbH",
    street: "Erhardstr. 2",
    postalCode: "48683",
    city: "Ahaus",
  },
};

// Fallback = Hauptstandort Ochtrup. Wird nur genutzt, wenn kein/kein bekannter
// Standort ermittelbar ist — so steht in der Widerrufsbelehrung nie eine leere
// Anbieter-Angabe.
const ANBIETER_FALLBACK: Anbieter = ANBIETER_BY_LOCATION["Vital-Fit"];

export function anbieterForLocation(name: string | null | undefined): Anbieter {
  if (name && ANBIETER_BY_LOCATION[name]) return ANBIETER_BY_LOCATION[name];
  return ANBIETER_FALLBACK;
}

// "Vital-Fit GmbH, Laurenzstr. 98, 48607 Ochtrup"
export function anbieterAdresse(a: Anbieter): string {
  return `${a.company}, ${a.street}, ${a.postalCode} ${a.city}`;
}

// ─────────────────────────────────────────────────────────────
// Widerrufsbelehrung (amtliche Kurzfassung, Dienstleistungs-Variante)
// ─────────────────────────────────────────────────────────────

export function widerrufsrechtText(a: Anbieter): string {
  return (
    `Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. ` +
    `Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses. Um Ihr Widerrufsrecht ` +
    `auszuüben, müssen Sie uns (${anbieterAdresse(a)}, E-Mail: ${LEGAL_MAIL}) mittels einer eindeutigen ` +
    `Erklärung (z. B. Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. ` +
    `Zur Wahrung der Frist genügt die rechtzeitige Absendung der Mitteilung.`
  );
}

export function widerrufsfolgenText(): string {
  return (
    `Wenn Sie diesen Vertrag widerrufen, erstatten wir Ihnen alle von Ihnen erhaltenen Zahlungen ` +
    `unverzüglich, spätestens binnen vierzehn Tagen ab Zugang Ihres Widerrufs. Haben Sie verlangt, dass die ` +
    `Leistungen während der Widerrufsfrist beginnen, so zahlen Sie uns einen angemessenen Betrag, der dem ` +
    `Anteil der bis zum Widerruf bereits erbrachten Leistungen im Verhältnis zum Gesamtumfang der im Vertrag ` +
    `vorgesehenen Leistungen entspricht.`
  );
}

// ─────────────────────────────────────────────────────────────
// Allgemeine Geschäftsbedingungen (Dienstleistung) — TEIL 3
// ─────────────────────────────────────────────────────────────

export interface AgbSection {
  heading: string;
  body: string;
}

export const AGB_STAND = "Juli 2026";

export const AGB_SECTIONS: AgbSection[] = [
  {
    heading: "§ 1 Anbieter und Geltungsbereich",
    body:
      "Anbieter ist – je nach gewähltem Studio – die Vital-Fit GmbH, Laurenzstr. 98, 48607 Ochtrup, oder die " +
      "Villa-Fit GmbH, Erhardstr. 2, 48683 Ahaus (nachfolgend „Anbieter“). Diese AGB gelten für alle Verträge " +
      "über die Gesundheits- und Coaching-Dienstleistungen des Anbieters. Verbraucher ist jede natürliche " +
      "Person, die den Vertrag zu überwiegend privaten Zwecken abschließt (§ 13 BGB).",
  },
  {
    heading: "§ 2 Leistungen",
    body:
      "Der Anbieter erbringt das „6-Wochen-Programm“. Dazu gehören je nach Studio insbesondere die persönliche " +
      "Betreuung mit Start-, Zwischen- und Abschlusstermin, ein Ernährungscoaching (online und vor Ort), die " +
      "Nutzung der Trainingsfläche und des allgemeinen Kursangebots sowie ggf. weitere studioabhängige Angebote " +
      "(z. B. Wellnessbereich in Ahaus). Nach vollständiger Absolvierung des zertifizierten " +
      "Online-Ernährungscoachings wird eine Teilnahmebescheinigung ausgestellt. Geschuldet ist ein fachgerechtes " +
      "Bemühen, kein bestimmter Erfolg.",
  },
  {
    heading: "§ 3 Vertragsschluss",
    body:
      "Der Kunde gibt über das Online-Anmeldeformular ein verbindliches Angebot ab; der Vertrag kommt mit der " +
      "Bestätigung durch den Anbieter zustande. Die 14-tägige Widerrufsfrist beginnt mit dem Vertragsschluss " +
      "(Bestätigung), nicht mit der Unterschrift beim Starttermin. Der im Formular genannte „Programmstart“ ist " +
      "der Leistungsbeginn und wird getrennt vom Datum des Vertragsschlusses ausgewiesen.",
  },
  {
    heading: "§ 4 Preis und Zahlung",
    body:
      "Das 6-Wochen-Programm kostet einmalig 99,00 € (inkl. USt.). Die Zahlung erfolgt per SEPA-Lastschrift auf " +
      "Grundlage des erteilten Mandats. Rücklastschriftkosten, die der Kunde zu vertreten hat, trägt der Kunde.",
  },
  {
    heading: "§ 5 Laufzeit und Übergang in eine Clubmitgliedschaft",
    body:
      "Das 6-Wochen-Programm ist auf sechs Wochen befristet. Wird es nicht spätestens fünf Wochen nach der " +
      "Online-Anmeldung in Textform gekündigt, geht es in eine Clubmitgliedschaft mit einer Erstlaufzeit von " +
      "12 Monaten zu monatlich 59,99 € über. Der konkrete letzte Kündigungstermin wird in der Anmeldung " +
      "ausgewiesen.",
  },
  {
    heading: "§ 6 Widerrufsrecht und Folgen",
    body:
      "Verbrauchern steht ein 14-tägiges Widerrufsrecht zu; Einzelheiten regelt die Widerrufsbelehrung, die dem " +
      "Kunden auf einem dauerhaften Datenträger (Bestätigungsmail sowie Vertragszettel) zur Verfügung gestellt " +
      "wird. Verlangt der Kunde den vorzeitigen Beginn, schuldet er im Widerrufsfall einen angemessenen, " +
      "anteiligen Betrag für die bereits erbrachten Leistungen. Der Zugang zum Online-Ernährungscoaching wird " +
      "erst nach Ablauf der Widerrufsfrist freigeschaltet; mit einem Widerruf endet der Zugang zum Programm.",
  },
  {
    heading: "§ 7 Gesundheitszustand und Mitwirkung",
    body:
      "Der Kunde versichert, gesundheitlich zur Teilnahme in der Lage zu sein, und klärt im Zweifel vorab " +
      "ärztlich ab. Für die Betreuung relevante Einschränkungen teilt er vor Beginn mit. Die Angebote ersetzen " +
      "keine ärztliche Behandlung.",
  },
  {
    heading: "§ 8 Haftung",
    body:
      "Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, " +
      "Körper und Gesundheit. Bei einfacher Fahrlässigkeit haftet er nur bei Verletzung wesentlicher " +
      "Vertragspflichten und begrenzt auf den vertragstypischen, vorhersehbaren Schaden.",
  },
  {
    heading: "§ 9 Datenschutz / Gesundheitsdaten",
    body:
      "Die Verarbeitung personenbezogener Daten einschließlich Gesundheitsdaten (Art. 9 DSGVO) erfolgt nach " +
      "Maßgabe der Datenschutzerklärung; Gesundheitsdaten nur auf Grundlage einer gesonderten Einwilligung.",
  },
  {
    heading: "§ 10 Krankenkassen-Erstattung",
    body:
      "Das digitale Online-Ernährungscoaching ist nach § 20 SGB V zertifiziert (ZPP – Zentrale Prüfstelle " +
      "Prävention). Die gesetzlichen Krankenkassen übernehmen die Kursgebühren daher nach vollständiger " +
      "Absolvierung und Vorlage der Teilnahmebescheinigung zum größten Teil; Höhe und Voraussetzungen richten " +
      "sich nach der jeweiligen Krankenkasse.",
  },
  {
    heading: "§ 11 Schlussbestimmungen",
    body:
      "Es gilt deutsches Recht. Die Unwirksamkeit einzelner Bestimmungen lässt die übrigen unberührt.",
  },
];
