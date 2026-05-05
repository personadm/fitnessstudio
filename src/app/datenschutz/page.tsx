import { LegalShell, LegalH2, LegalNote } from "@/components/LegalShell";

export const metadata = { title: "Datenschutzerklärung" };

export default function DatenschutzPage() {
  return (
    <LegalShell title="Datenschutzerklärung">
      <LegalNote>
        <strong>Hinweis:</strong> Dies ist ein Template, das die typischen Datenverarbeitungen dieser App abdeckt
        (Mail-Sammlung mit DOI, Mitgliedsanmeldung, Newsletter). Lass es vor Live-Gang von einem Anwalt oder über einen
        Generator wie e-recht24.de oder datenschutz-generator.de prüfen / verfeinern. Tausch <code>[Platzhalter]</code> aus.
      </LegalNote>

      <LegalH2>1. Verantwortlicher</LegalH2>
      <p>
        Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br />
        [Name des Studios / Inhabers]<br />
        [Anschrift]<br />
        E-Mail: [kontakt@deinstudio.de]
      </p>

      <LegalH2>2. Erhebung und Speicherung personenbezogener Daten</LegalH2>
      <p>
        Wir verarbeiten personenbezogene Daten nur, wenn dies für die Bereitstellung einer funktionsfähigen Website sowie
        unserer Inhalte und Leistungen erforderlich ist – oder wenn du uns eine Einwilligung gegeben hast (Art. 6 Abs. 1
        lit. a DSGVO).
      </p>

      <LegalH2>3. Newsletter und Tarif-Informationen (Mail-Eintragung)</LegalH2>
      <p>
        Wenn du dich auf der Startseite mit deiner E-Mail-Adresse einträgst, um unsere Tarife zu erhalten, verarbeiten wir
        folgende Daten:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>E-Mail-Adresse</li>
        <li>Zeitpunkt der Eintragung</li>
        <li>IP-Adresse zum Zeitpunkt der Eintragung (zur Beleg-Pflicht)</li>
        <li>Wortlaut der erteilten Einwilligung</li>
      </ul>
      <p>
        Wir nutzen das <strong>Double-Opt-In-Verfahren</strong>: Nach deiner Eintragung senden wir dir eine
        Bestätigungsmail. Erst nach Klick auf den Bestätigungslink versenden wir dir die Tarif-Informationen. Bis dahin
        werden keine Werbemails verschickt.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Du kannst die Einwilligung jederzeit über den
        Abmelde-Link in jeder Mail oder per Mail an [kontakt@deinstudio.de] widerrufen.
      </p>

      <LegalH2>4. Mitgliedsanmeldung</LegalH2>
      <p>
        Bei der Anmeldung über das Anmeldeformular verarbeiten wir folgende Daten zur Vertragsabwicklung:
      </p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Vor- und Nachname</li>
        <li>E-Mail-Adresse</li>
        <li>Anschrift</li>
        <li>Geburtsdatum</li>
        <li>Telefonnummer (sofern angegeben)</li>
        <li>Gewählter Tarif</li>
      </ul>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung und -erfüllung). Wir speichern diese Daten für die
        Dauer der Mitgliedschaft sowie der gesetzlichen Aufbewahrungsfristen (z.B. § 257 HGB, § 147 AO).
      </p>

      <LegalH2>5. Auftragsverarbeiter</LegalH2>
      <p>Zur Bereitstellung dieser Website nutzen wir folgende Dienstleister:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li><strong>Render</strong> (Render Services, Inc., USA) – Hosting</li>
        <li><strong>Supabase</strong> (Supabase Inc., USA) – Datenbank-Hosting (EU-Region Frankfurt)</li>
        <li><strong>Resend</strong> (Resend, Inc., USA) – Versand transaktionaler Mails und Newsletter</li>
      </ul>
      <p>Mit allen Dienstleistern haben wir Auftragsverarbeitungsverträge (AVV) gemäß Art. 28 DSGVO abgeschlossen.</p>

      <LegalH2>6. Deine Rechte</LegalH2>
      <p>Du hast jederzeit das Recht:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>auf Auskunft über deine gespeicherten Daten (Art. 15 DSGVO)</li>
        <li>auf Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
        <li>auf Löschung (Art. 17 DSGVO)</li>
        <li>auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>auf Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        <li>auf Beschwerde bei einer Aufsichtsbehörde</li>
      </ul>
      <p>
        Wende dich für die Ausübung deiner Rechte an [kontakt@deinstudio.de].
      </p>

      <LegalH2>7. Speicherdauer</LegalH2>
      <p>
        Eingetragene Mail-Adressen ohne Mitgliedschaft löschen wir spätestens nach 24 Monaten Inaktivität. Mitgliederdaten
        werden bis zum Ablauf gesetzlicher Aufbewahrungsfristen gespeichert (in der Regel 10 Jahre nach Vertragsende).
      </p>

      <LegalH2>8. Stand</LegalH2>
      <p>Stand dieser Datenschutzerklärung: [Datum].</p>
    </LegalShell>
  );
}
