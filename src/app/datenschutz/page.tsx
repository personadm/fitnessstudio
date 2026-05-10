import Link from "next/link";

const STUDIO = process.env.STUDIO_NAME ?? "Studio Iron";

export const metadata = {
  title: "Datenschutzerklärung",
  description: "Informationen gemäß DSGVO zur Verarbeitung personenbezogener Daten.",
};

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-cream">
      {/* Top Bar */}
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-[11px] uppercase tracking-[0.14em]">
          <Link href="/" className="font-mono hover:text-ink-soft">
            ← Zurück
          </Link>
          <span className="font-mono">{STUDIO}</span>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <p className="label mb-6">Rechtliches</p>
        <h1 className="text-display-italic text-5xl md:text-7xl leading-[0.95] mb-12">
          Datenschutzerklärung
        </h1>

        <div className="text-display text-base leading-relaxed space-y-6 text-ink-soft">
          <p>
            Wir freuen uns sehr über Ihr Interesse an unserem Unternehmen. Datenschutz hat einen
            besonders hohen Stellenwert für die Geschäftsleitung der Villa-Fit GmbH. Eine Nutzung
            der Internetseiten der Villa-Fit GmbH ist grundsätzlich ohne jede Angabe
            personenbezogener Daten möglich. Sofern eine betroffene Person besondere Services
            unseres Unternehmens über unsere Internetseite in Anspruch nehmen möchte, könnte jedoch
            eine Verarbeitung personenbezogener Daten erforderlich werden. Ist die Verarbeitung
            personenbezogener Daten erforderlich und besteht für eine solche Verarbeitung keine
            gesetzliche Grundlage, holen wir generell eine Einwilligung der betroffenen Person ein.
          </p>
          <p>
            Die Verarbeitung personenbezogener Daten, beispielsweise des Namens, der Anschrift,
            E-Mail-Adresse oder Telefonnummer einer betroffenen Person, erfolgt stets im Einklang
            mit der Datenschutz-Grundverordnung und in Übereinstimmung mit den für die Villa-Fit
            GmbH geltenden landesspezifischen Datenschutzbestimmungen. Mittels dieser
            Datenschutzerklärung möchte unser Unternehmen die Öffentlichkeit über Art, Umfang und
            Zweck der von uns erhobenen, genutzten und verarbeiteten personenbezogenen Daten
            informieren. Ferner werden betroffene Personen mittels dieser Datenschutzerklärung über
            die ihnen zustehenden Rechte aufgeklärt.
          </p>
          <p>
            Die Villa-Fit GmbH hat als für die Verarbeitung Verantwortlicher zahlreiche technische
            und organisatorische Maßnahmen umgesetzt, um einen möglichst lückenlosen Schutz der
            über diese Internetseite verarbeiteten personenbezogenen Daten sicherzustellen. Dennoch
            können Internetbasierte Datenübertragungen grundsätzlich Sicherheitslücken aufweisen,
            sodass ein absoluter Schutz nicht gewährleistet werden kann. Aus diesem Grund steht es
            jeder betroffenen Person frei, personenbezogene Daten auch auf alternativen Wegen,
            beispielsweise telefonisch, an uns zu übermitteln.
          </p>
        </div>

        <Section title="1. Begriffsbestimmungen">
          <p>
            Die Datenschutzerklärung der Villa-Fit GmbH beruht auf den Begrifflichkeiten, die durch
            den Europäischen Richtlinien- und Verordnungsgeber beim Erlass der
            Datenschutz-Grundverordnung (DS-GVO) verwendet wurden. Unsere Datenschutzerklärung soll
            sowohl für die Öffentlichkeit als auch für unsere Kunden und Geschäftspartner einfach
            lesbar und verständlich sein. Um dies zu gewährleisten, möchten wir vorab die
            verwendeten Begrifflichkeiten erläutern.
          </p>

          <h3 className="text-display text-lg mt-6 mb-2 text-ink">a) Personenbezogene Daten</h3>
          <p>
            Personenbezogene Daten sind alle Informationen, die sich auf eine identifizierte oder
            identifizierbare natürliche Person beziehen. Als identifizierbar wird eine natürliche
            Person angesehen, die direkt oder indirekt, insbesondere mittels Zuordnung zu einer
            Kennung wie einem Namen, zu einer Kennnummer, zu Standortdaten, zu einer Online-Kennung
            oder zu einem oder mehreren besonderen Merkmalen, die Ausdruck der physischen,
            physiologischen, genetischen, psychischen, wirtschaftlichen, kulturellen oder sozialen
            Identität dieser natürlichen Person sind, identifiziert werden kann.
          </p>

          <h3 className="text-display text-lg mt-6 mb-2 text-ink">b) Betroffene Person</h3>
          <p>
            Betroffene Person ist jede identifizierte oder identifizierbare natürliche Person,
            deren personenbezogene Daten von dem für die Verarbeitung Verantwortlichen verarbeitet
            werden.
          </p>

          <h3 className="text-display text-lg mt-6 mb-2 text-ink">c) Verarbeitung</h3>
          <p>
            Verarbeitung ist jeder mit oder ohne Hilfe automatisierter Verfahren ausgeführte
            Vorgang oder jede solche Vorgangsreihe im Zusammenhang mit personenbezogenen Daten wie
            das Erheben, das Erfassen, die Organisation, das Ordnen, die Speicherung, die Anpassung
            oder Veränderung, das Auslesen, das Abfragen, die Verwendung, die Offenlegung durch
            Übermittlung, Verbreitung oder eine andere Form der Bereitstellung, den Abgleich oder
            die Verknüpfung, die Einschränkung, das Löschen oder die Vernichtung.
          </p>

          <h3 className="text-display text-lg mt-6 mb-2 text-ink">
            d) Einschränkung der Verarbeitung
          </h3>
          <p>
            Einschränkung der Verarbeitung ist die Markierung gespeicherter personenbezogener Daten
            mit dem Ziel, ihre künftige Verarbeitung einzuschränken.
          </p>

          <h3 className="text-display text-lg mt-6 mb-2 text-ink">e) Profiling</h3>
          <p>
            Profiling ist jede Art der automatisierten Verarbeitung personenbezogener Daten, die
            darin besteht, dass diese personenbezogenen Daten verwendet werden, um bestimmte
            persönliche Aspekte, die sich auf eine natürliche Person beziehen, zu bewerten,
            insbesondere, um Aspekte bezüglich Arbeitsleistung, wirtschaftlicher Lage, Gesundheit,
            persönlicher Vorlieben, Interessen, Zuverlässigkeit, Verhalten, Aufenthaltsort oder
            Ortswechsel dieser natürlichen Person zu analysieren oder vorherzusagen.
          </p>

          <h3 className="text-display text-lg mt-6 mb-2 text-ink">f) Pseudonymisierung</h3>
          <p>
            Pseudonymisierung ist die Verarbeitung personenbezogener Daten in einer Weise, auf
            welche die personenbezogenen Daten ohne Hinzuziehung zusätzlicher Informationen nicht
            mehr einer spezifischen betroffenen Person zugeordnet werden können, sofern diese
            zusätzlichen Informationen gesondert aufbewahrt werden und technischen und
            organisatorischen Maßnahmen unterliegen.
          </p>

          <h3 className="text-display text-lg mt-6 mb-2 text-ink">
            g) Verantwortlicher oder für die Verarbeitung Verantwortlicher
          </h3>
          <p>
            Verantwortlicher oder für die Verarbeitung Verantwortlicher ist die natürliche oder
            juristische Person, Behörde, Einrichtung oder andere Stelle, die allein oder gemeinsam
            mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten
            entscheidet.
          </p>

          <h3 className="text-display text-lg mt-6 mb-2 text-ink">h) Auftragsverarbeiter</h3>
          <p>
            Auftragsverarbeiter ist eine natürliche oder juristische Person, Behörde, Einrichtung
            oder andere Stelle, die personenbezogene Daten im Auftrag des Verantwortlichen
            verarbeitet.
          </p>

          <h3 className="text-display text-lg mt-6 mb-2 text-ink">i) Empfänger</h3>
          <p>
            Empfänger ist eine natürliche oder juristische Person, Behörde, Einrichtung oder andere
            Stelle, der personenbezogene Daten offengelegt werden, unabhängig davon, ob es sich bei
            ihr um einen Dritten handelt oder nicht.
          </p>

          <h3 className="text-display text-lg mt-6 mb-2 text-ink">j) Dritter</h3>
          <p>
            Dritter ist eine natürliche oder juristische Person, Behörde, Einrichtung oder andere
            Stelle außer der betroffenen Person, dem Verantwortlichen, dem Auftragsverarbeiter und
            den Personen, die unter der unmittelbaren Verantwortung des Verantwortlichen oder des
            Auftragsverarbeiters befugt sind, die personenbezogenen Daten zu verarbeiten.
          </p>

          <h3 className="text-display text-lg mt-6 mb-2 text-ink">k) Einwilligung</h3>
          <p>
            Einwilligung ist jede von der betroffenen Person freiwillig für den bestimmten Fall in
            informierter Weise und unmissverständlich abgegebene Willensbekundung in Form einer
            Erklärung oder einer sonstigen eindeutigen bestätigenden Handlung, mit der die
            betroffene Person zu verstehen gibt, dass sie mit der Verarbeitung der sie betreffenden
            personenbezogenen Daten einverstanden ist.
          </p>
        </Section>

        <Section title="2. Name und Anschrift des Verantwortlichen">
          <p>
            Verantwortlicher im Sinne der Datenschutz-Grundverordnung sind die:
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <p className="font-medium text-ink">Villa-Fit GmbH</p>
              <p>Erhardstr. 2 · 48683 Ahaus · Tel.: 02561 / 961166</p>
            </div>
            <div>
              <p className="font-medium text-ink">Vital-Fit GmbH</p>
              <p>Laurenzstr. 98 · 48607 Ochtrup · Tel.: 02553 / 7216466</p>
            </div>
            <div className="pt-3">
              <p>
                E-Mail:{" "}
                <a
                  href="mailto:mail@gesundheitscoaches.de"
                  className="underline underline-offset-2 hover:text-ink"
                >
                  mail@gesundheitscoaches.de
                </a>
              </p>
              <p>
                Website:{" "}
                <a
                  href="https://www.gesundheitscoaches.de"
                  className="underline underline-offset-2 hover:text-ink"
                >
                  https://www.gesundheitscoaches.de
                </a>
              </p>
            </div>
          </div>
        </Section>

        <Section title="3. Cookies">
          <p>
            Unsere Internetseiten verwenden Cookies. Cookies sind Textdateien, welche über einen
            Internetbrowser auf einem Computersystem abgelegt und gespeichert werden. Viele Cookies
            enthalten eine sogenannte Cookie-ID, eine eindeutige Kennung, durch welche
            Internetseiten und Server dem konkreten Internetbrowser zugeordnet werden können.
          </p>
          <p className="mt-4">
            Durch den Einsatz von Cookies können wir den Nutzern dieser Internetseite
            nutzerfreundlichere Services bereitstellen, die ohne die Cookie-Setzung nicht möglich
            wären. Mittels eines Cookies können die Informationen und Angebote auf unserer
            Internetseite im Sinne des Benutzers optimiert werden.
          </p>
          <p className="mt-4">
            Die betroffene Person kann die Setzung von Cookies durch unsere Internetseite jederzeit
            mittels einer entsprechenden Einstellung des genutzten Internetbrowsers verhindern und
            damit der Setzung von Cookies dauerhaft widersprechen. Ferner können bereits gesetzte
            Cookies jederzeit über einen Internetbrowser oder andere Softwareprogramme gelöscht
            werden.
          </p>
        </Section>

        <Section title="4. Erfassung von allgemeinen Daten und Informationen">
          <p>
            Unsere Internetseite erfasst mit jedem Aufruf eine Reihe von allgemeinen Daten und
            Informationen, die in den Logfiles des Servers gespeichert werden. Erfasst werden
            können: (1) verwendete Browsertypen und Versionen, (2) das vom zugreifenden System
            verwendete Betriebssystem, (3) die Internetseite, von welcher ein zugreifendes System
            auf unsere Internetseite gelangt (Referrer), (4) die Unterwebseiten, welche über ein
            zugreifendes System auf unserer Internetseite angesteuert werden, (5) das Datum und
            die Uhrzeit eines Zugriffs, (6) eine Internet-Protokoll-Adresse (IP-Adresse), (7) der
            Internet-Service-Provider des zugreifenden Systems und (8) sonstige ähnliche Daten und
            Informationen, die der Gefahrenabwehr im Falle von Angriffen auf unsere
            informationstechnologischen Systeme dienen.
          </p>
          <p className="mt-4">
            Bei der Nutzung dieser allgemeinen Daten und Informationen ziehen wir keine
            Rückschlüsse auf die betroffene Person. Diese Informationen werden vielmehr benötigt,
            um (1) die Inhalte unserer Internetseite korrekt auszuliefern, (2) die Inhalte unserer
            Internetseite sowie die Werbung für diese zu optimieren, (3) die dauerhafte
            Funktionsfähigkeit unserer informationstechnologischen Systeme und der Technik unserer
            Internetseite zu gewährleisten sowie (4) um Strafverfolgungsbehörden im Falle eines
            Cyberangriffes die zur Strafverfolgung notwendigen Informationen bereitzustellen.
          </p>
        </Section>

        <Section title="5. Registrierung auf unserer Internetseite">
          <p>
            Die betroffene Person hat die Möglichkeit, sich auf der Internetseite unter Angabe von
            personenbezogenen Daten zu registrieren. Welche personenbezogenen Daten dabei
            übermittelt werden, ergibt sich aus der jeweiligen Eingabemaske. Die eingegebenen
            personenbezogenen Daten werden ausschließlich für die interne Verwendung und für
            eigene Zwecke erhoben und gespeichert.
          </p>
          <p className="mt-4">
            Registrierten Personen steht die Möglichkeit frei, die bei der Registrierung
            angegebenen personenbezogenen Daten jederzeit abzuändern oder vollständig aus dem
            Datenbestand löschen zu lassen.
          </p>
        </Section>

        <Section title="6. Abonnement unseres Newsletters">
          <p>
            Auf unserer Internetseite wird den Benutzern die Möglichkeit eingeräumt, den
            Newsletter unseres Unternehmens zu abonnieren. An die erstmalig für den
            Newsletterversand eingetragene E-Mail-Adresse wird aus rechtlichen Gründen eine
            Bestätigungsmail im Double-Opt-In-Verfahren versendet. Diese Bestätigungsmail dient
            der Überprüfung, ob der Inhaber der E-Mail-Adresse den Empfang des Newsletters
            autorisiert hat.
          </p>
          <p className="mt-4">
            Die im Rahmen einer Anmeldung zum Newsletter erhobenen personenbezogenen Daten werden
            ausschließlich zum Versand unseres Newsletters verwendet. Es erfolgt keine Weitergabe
            der personenbezogenen Daten an Dritte. Das Abonnement kann jederzeit gekündigt werden
            — entweder über den entsprechenden Link in jedem Newsletter oder durch Mitteilung an
            uns.
          </p>
        </Section>

        <Section title="7. Kontaktmöglichkeit über die Internetseite">
          <p>
            Unsere Internetseite enthält Angaben, die eine schnelle elektronische Kontaktaufnahme
            zu unserem Unternehmen ermöglichen, was eine allgemeine E-Mail-Adresse umfasst. Sofern
            eine betroffene Person per E-Mail oder über ein Kontaktformular Kontakt mit uns
            aufnimmt, werden die übermittelten personenbezogenen Daten automatisch gespeichert.
            Solche Daten werden für Zwecke der Bearbeitung oder der Kontaktaufnahme zur betroffenen
            Person gespeichert. Es erfolgt keine Weitergabe an Dritte.
          </p>
        </Section>

        <Section title="8. Routinemäßige Löschung und Sperrung von personenbezogenen Daten">
          <p>
            Wir verarbeiten und speichern personenbezogene Daten der betroffenen Person nur für
            den Zeitraum, der zur Erreichung des Speicherungszwecks erforderlich ist oder sofern
            dies durch den Europäischen Richtlinien- und Verordnungsgeber oder einen anderen
            Gesetzgeber in Gesetzen oder Vorschriften vorgesehen wurde.
          </p>
          <p className="mt-4">
            Entfällt der Speicherungszweck oder läuft eine vorgeschriebene Speicherfrist ab,
            werden die personenbezogenen Daten routinemäßig und entsprechend den gesetzlichen
            Vorschriften gesperrt oder gelöscht.
          </p>
        </Section>

        <Section title="9. Rechte der betroffenen Person">
          <p>
            Als betroffene Person haben Sie nach DSGVO unter anderem folgende Rechte:
          </p>
          <ul className="mt-4 ml-6 space-y-2 list-disc">
            <li>
              <span className="font-medium text-ink">Recht auf Bestätigung</span> darüber, ob Sie
              betreffende personenbezogene Daten verarbeitet werden.
            </li>
            <li>
              <span className="font-medium text-ink">Recht auf Auskunft</span> über die
              gespeicherten personenbezogenen Daten und eine Kopie dieser Auskunft.
            </li>
            <li>
              <span className="font-medium text-ink">Recht auf Berichtigung</span> unrichtiger
              personenbezogener Daten.
            </li>
            <li>
              <span className="font-medium text-ink">Recht auf Löschung</span> („Recht auf
              Vergessen werden"), sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
            </li>
            <li>
              <span className="font-medium text-ink">Recht auf Einschränkung der Verarbeitung</span>{" "}
              unter bestimmten Voraussetzungen.
            </li>
            <li>
              <span className="font-medium text-ink">Recht auf Datenübertragbarkeit</span> in einem
              strukturierten, gängigen und maschinenlesbaren Format.
            </li>
            <li>
              <span className="font-medium text-ink">Recht auf Widerspruch</span> gegen die
              Verarbeitung Ihrer personenbezogenen Daten.
            </li>
            <li>
              <span className="font-medium text-ink">
                Recht auf Widerruf einer datenschutzrechtlichen Einwilligung
              </span>{" "}
              jederzeit mit Wirkung für die Zukunft.
            </li>
            <li>
              <span className="font-medium text-ink">Beschwerderecht</span> bei einer
              Aufsichtsbehörde.
            </li>
          </ul>
          <p className="mt-6">
            Möchten Sie eines dieser Rechte in Anspruch nehmen, wenden Sie sich jederzeit an einen
            Mitarbeiter der Villa-Fit GmbH oder Vital-Fit GmbH.
          </p>
        </Section>

        <Section title="10. Rechtsgrundlage der Verarbeitung">
          <p>
            Art. 6 I lit. a DS-GVO dient unserem Unternehmen als Rechtsgrundlage für
            Verarbeitungsvorgänge, bei denen wir eine Einwilligung für einen bestimmten
            Verarbeitungszweck einholen. Ist die Verarbeitung personenbezogener Daten zur
            Erfüllung eines Vertrags, dessen Vertragspartei die betroffene Person ist,
            erforderlich, so beruht die Verarbeitung auf Art. 6 I lit. b DS-GVO. Gleiches gilt für
            Verarbeitungsvorgänge, die zur Durchführung vorvertraglicher Maßnahmen erforderlich
            sind, etwa in Fällen von Anfragen zu unseren Produkten oder Leistungen.
          </p>
          <p className="mt-4">
            Unterliegt unser Unternehmen einer rechtlichen Verpflichtung durch welche eine
            Verarbeitung von personenbezogenen Daten erforderlich wird, so basiert die
            Verarbeitung auf Art. 6 I lit. c DS-GVO. Letztlich könnten Verarbeitungsvorgänge auf
            Art. 6 I lit. f DS-GVO beruhen, wenn die Verarbeitung zur Wahrung eines berechtigten
            Interesses unseres Unternehmens oder eines Dritten erforderlich ist, sofern die
            Interessen, Grundrechte und Grundfreiheiten des Betroffenen nicht überwiegen.
          </p>
        </Section>

        <Section title="11. Dauer, für die die personenbezogenen Daten gespeichert werden">
          <p>
            Das Kriterium für die Dauer der Speicherung von personenbezogenen Daten ist die
            jeweilige gesetzliche Aufbewahrungsfrist. Nach Ablauf der Frist werden die
            entsprechenden Daten routinemäßig gelöscht, sofern sie nicht mehr zur Vertragserfüllung
            oder Vertragsanbahnung erforderlich sind.
          </p>
        </Section>

        <Section title="12. Bestehen einer automatisierten Entscheidungsfindung">
          <p>
            Als verantwortungsbewusstes Unternehmen verzichten wir auf eine automatische
            Entscheidungsfindung oder ein Profiling.
          </p>
        </Section>

        <div className="mt-16 border-t border-ink/15 pt-10 text-sm text-muted">
          <p>
            Diese Datenschutzerklärung wurde ursprünglich durch den Datenschutzerklärungs-Generator
            der DGD Deutsche Gesellschaft für Datenschutz GmbH in Kooperation mit dem Datenschutz
            Anwalt Christian Solmecke erstellt und für diese Seite angepasst.
          </p>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-ink/15">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span>
            © {new Date().getFullYear()} {STUDIO}
          </span>
          <nav className="flex gap-6">
            <Link href="/impressum" className="hover:text-ink">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-ink">
              Datenschutz
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-display text-xl md:text-2xl mb-4 text-ink">{title}</h2>
      <div className="text-display text-base leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}
