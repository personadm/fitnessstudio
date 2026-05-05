import { LegalShell, LegalH2, LegalNote } from "@/components/LegalShell";

export const metadata = { title: "AGB" };

export default function AgbPage() {
  return (
    <LegalShell title="Allgemeine Geschäftsbedingungen">
      <LegalNote>
        <strong>Hinweis:</strong> Dies ist ein generisches Template. AGB für Fitnessstudios sind ein heikles Feld
        (Mindestlaufzeiten, Kündigungsfristen, Sondervereinbarungen). <strong>Lass deine AGB unbedingt von einem Anwalt
        oder einem Fachverband (z.B. DSSV) prüfen</strong>, bevor sie live gehen. Tausch <code>[Platzhalter]</code> aus.
      </LegalNote>

      <LegalH2>§ 1 Geltungsbereich</LegalH2>
      <p>
        Diese AGB regeln das Vertragsverhältnis zwischen [Name des Studios] (im Folgenden „Studio") und dem Mitglied. Mit
        Unterzeichnung des Mitgliedsantrags bzw. Absenden der Online-Anmeldung erkennt das Mitglied diese AGB an.
      </p>

      <LegalH2>§ 2 Vertragsabschluss</LegalH2>
      <p>
        Der Vertrag kommt zustande, sobald das Studio die Anmeldung bestätigt. Die Anmeldung über die Website ist eine
        bindende Willenserklärung; der Vertragsschluss erfolgt erst mit unserer Bestätigung per E-Mail oder schriftlich.
      </p>

      <LegalH2>§ 3 Beiträge und Zahlung</LegalH2>
      <p>
        Die Höhe des Mitgliedsbeitrags richtet sich nach dem gewählten Tarif. Beiträge werden monatlich/quartalsweise im
        Voraus per SEPA-Lastschrift abgebucht. Bei Zahlungsverzug ist das Studio berechtigt, den Zugang zum Studio bis zur
        vollständigen Zahlung zu sperren.
      </p>

      <LegalH2>§ 4 Vertragslaufzeit und Kündigung</LegalH2>
      <p>
        Die Mindestvertragslaufzeit beträgt [12 Monate / individuell]. Der Vertrag verlängert sich automatisch um jeweils
        [3 Monate], wenn er nicht spätestens [1 Monat] vor Ablauf gekündigt wird (Textform genügt nach § 309 Nr. 9 BGB).
      </p>
      <p>
        <strong>Wichtig (Stand: Mai 2026):</strong> Nach § 309 Nr. 9 BGB darf die Mindestlaufzeit für Verbraucherverträge
        mit automatischer Verlängerung 24 Monate nicht überschreiten; nach automatischer Verlängerung muss eine
        monatliche Kündigungsmöglichkeit bestehen.
      </p>

      <LegalH2>§ 5 Außerordentliche Kündigung</LegalH2>
      <p>
        Aus wichtigem Grund (insbesondere längere Krankheit mit ärztlichem Attest, Umzug über [50] km hinaus, Schwangerschaft)
        kann der Vertrag außerordentlich gekündigt werden. Der wichtige Grund ist dem Studio nachzuweisen.
      </p>

      <LegalH2>§ 6 Hausordnung</LegalH2>
      <p>
        Die im Studio aushängende Hausordnung ist Bestandteil dieser AGB. Bei wiederholten oder schweren Verstößen kann
        das Studio den Vertrag fristlos kündigen.
      </p>

      <LegalH2>§ 7 Haftung</LegalH2>
      <p>
        Die Haftung des Studios für leichte Fahrlässigkeit ist – außer bei Verletzung von Leben, Körper oder Gesundheit
        sowie bei Verletzung wesentlicher Vertragspflichten – ausgeschlossen. Im Übrigen haftet das Studio nach den
        gesetzlichen Vorschriften.
      </p>

      <LegalH2>§ 8 Datenschutz</LegalH2>
      <p>
        Die Verarbeitung personenbezogener Daten erfolgt nach den gesetzlichen Vorschriften. Details findest du in unserer{" "}
        <a href="/datenschutz" className="underline">Datenschutzerklärung</a>.
      </p>

      <LegalH2>§ 9 Änderungen</LegalH2>
      <p>
        Änderungen dieser AGB werden den Mitgliedern in Textform (z.B. per E-Mail) mit einer Frist von [6 Wochen] mitgeteilt.
        Widerspricht das Mitglied nicht innerhalb dieser Frist, gelten die Änderungen als angenommen.
      </p>

      <LegalH2>§ 10 Schlussbestimmungen</LegalH2>
      <p>
        Erfüllungsort und Gerichtsstand ist [Sitz des Studios], soweit gesetzlich zulässig. Sollten einzelne Bestimmungen
        unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
      </p>

      <p className="mt-12 text-sm text-muted">Stand: [Datum]</p>
    </LegalShell>
  );
}
