import { LegalShell, LegalH2, LegalNote } from "@/components/LegalShell";

export const metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <LegalShell title="Impressum">
      <LegalNote>
        <strong>Hinweis:</strong> Dieses Impressum ist ein Template. Tausch alle <code>[Platzhalter]</code> durch deine
        echten Daten aus, bevor die Seite live geht. Pflicht in DE nach §5 TMG.
      </LegalNote>

      <LegalH2>Angaben gemäß § 5 TMG</LegalH2>
      <p>
        [Name des Studios / Inhabers]<br />
        [Straße und Hausnummer]<br />
        [PLZ und Ort]
      </p>

      <LegalH2>Kontakt</LegalH2>
      <p>
        Telefon: [Telefonnummer]<br />
        E-Mail: [kontakt@deinstudio.de]
      </p>

      <LegalH2>Vertreten durch</LegalH2>
      <p>[Name der vertretungsberechtigten Person]</p>

      <LegalH2>Registereintrag</LegalH2>
      <p>
        Eintragung im Handelsregister.<br />
        Registergericht: [Amtsgericht]<br />
        Registernummer: [HRB ...]
      </p>

      <LegalH2>Umsatzsteuer-ID</LegalH2>
      <p>
        Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
        [DE...]
      </p>

      <LegalH2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</LegalH2>
      <p>
        [Name]<br />
        [Anschrift]
      </p>

      <LegalH2>EU-Streitschlichtung</LegalH2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
        <a href="https://ec.europa.eu/consumers/odr/" className="underline">https://ec.europa.eu/consumers/odr/</a>.
        Unsere E-Mail-Adresse findest du oben im Impressum.
      </p>

      <LegalH2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</LegalH2>
      <p>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </LegalShell>
  );
}
