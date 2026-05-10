import Link from "next/link";

const STUDIO = process.env.STUDIO_NAME ?? "Studio Iron";

export const metadata = {
  title: "Datenschutzerklärung",
  description: "Informationen gemäß DSGVO zur Verarbeitung personenbezogener Daten.",
};

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-cream">
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
          Datenschutz
        </h1>

        <div className="text-display text-base leading-relaxed space-y-6 text-ink-soft">
          <p className="text-display-italic text-xl text-ink">
            Der Schutz persönlicher Daten liegt uns am Herzen!
          </p>
          <p>
            Wir nehmen den Datenschutz sehr ernst und legen großen Wert auf den
            verantwortungsvollen und sicheren Umgang mit personenbezogenen Daten. Die Beachtung
            der Bestimmungen des Bundesdatenschutzgesetzes hat für uns die oberste Priorität.
          </p>
          <p>
            Dazu haben wir technische und organisatorische Maßnahmen getroffen, die sicherstellen,
            dass die Vorschriften über den Datenschutz sowohl von uns als auch von den durch uns
            beauftragten externen Dienstleistern beachtet werden.
          </p>
        </div>

        <Section title="Gibt es Fragen?">
          <p>
            Fragen zum Thema Datenschutz bei Villa-Fit Ahaus können jederzeit per Mail an folgende
            Adresse gesendet werden:{" "}
            <a
              href="mailto:club-ahaus@gesundheitscoaches.de"
              className="underline underline-offset-2 hover:text-ink"
            >
              club-ahaus@gesundheitscoaches.de
            </a>
          </p>
        </Section>

        <Section title="Verantwortlicher">
          <div className="space-y-1">
            <p className="font-medium text-ink">Villa-Fit</p>
            <p>Erhardstr. 2, 48683 Ahaus</p>
            <p>
              Telefon:{" "}
              <a href="tel:02561961166" className="underline underline-offset-2 hover:text-ink">
                02561 961166
              </a>
            </p>
            <p>
              E-Mail:{" "}
              <a
                href="mailto:club-ahaus@gesundheitscoaches.de"
                className="underline underline-offset-2 hover:text-ink"
              >
                club-ahaus@gesundheitscoaches.de
              </a>
            </p>
          </div>
          <p className="mt-4">
            Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder
            gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von
            personenbezogenen Daten (z.B. Namen, E-Mail-Adressen o. Ä.) entscheidet.
          </p>
        </Section>

        <Section title="1. Grundsätzliche Angaben zur Datenverarbeitung und Rechtsgrundlagen">
          <p>
            <strong>1.1</strong> Diese Datenschutzerklärung klärt über die Art, den Umfang und
            Zweck der Verarbeitung von personenbezogenen Daten innerhalb unseres Onlineangebotes
            und der mit ihm verbundenen Webseiten, Funktionen und Inhalte (nachfolgend gemeinsam
            bezeichnet als „Onlineangebot" oder „Website") auf. Die Datenschutzerklärung gilt
            unabhängig von den verwendeten Domains, Systemen, Plattformen und Geräten (z.B.
            Desktop oder Mobile) auf denen das Onlineangebot ausgeführt wird.
          </p>
          <p className="mt-4">
            <strong>1.2</strong> Die verwendeten Begrifflichkeiten, wie z.B. „personenbezogene
            Daten" oder deren „Verarbeitung" verweisen wir auf die Definitionen im Art. 4 der
            Datenschutzgrundverordnung (DSGVO).
          </p>
          <p className="mt-4">
            <strong>1.3</strong> Zu den im Rahmen dieses Onlineangebotes verarbeiteten
            personenbezogenen Daten der Nutzer gehören Nutzungsdaten (z.B. die besuchten
            Webseiten unseres Onlineangebotes, Interesse an unseren Produkten) und Inhaltsdaten
            (z.B. Eingaben im Kontakt-/Teilnahmeformular).
          </p>
          <p className="mt-4">
            <strong>1.4</strong> Der Begriff „Nutzer" umfasst alle Kategorien von der
            Datenverarbeitung betroffener Personen. Zu ihnen gehören Interessenten und sonstige
            Besucher unseres Onlineangebotes. Die verwendeten Begrifflichkeiten, wie z.B.
            „Nutzer" sind geschlechtsneutral zu verstehen.
          </p>
          <p className="mt-4">
            <strong>1.5</strong> Wir verarbeiten personenbezogene Daten der Nutzer nur unter
            Einhaltung der einschlägigen Datenschutzbestimmungen. Das bedeutet, die Daten der
            Nutzer werden nur bei Vorliegen einer gesetzlichen Erlaubnis verarbeitet. D.h.,
            insbesondere wenn die Datenverarbeitung zur Erbringung unserer vertraglichen
            Leistungen (z.B. Bearbeitung von Aufträgen) sowie Online-Services erforderlich, bzw.
            gesetzlich vorgeschrieben ist, eine Einwilligung der Nutzer vorliegt, als auch
            aufgrund unserer berechtigten Interessen (d.h. Interesse an der Analyse, Optimierung
            und wirtschaftlichem Betrieb und Sicherheit unseres Onlineangebotes im Sinne des Art.
            6 Abs. 1 lit. f. DSGVO, insbesondere bei der Reichweitenmessung, Erstellung von
            Profilen zu Werbe- und Marketingzwecken sowie Erhebung von Zugriffsdaten und Einsatz
            der Dienste von Drittanbietern.
          </p>
          <p className="mt-4">
            <strong>1.6</strong> Wir weisen darauf hin, dass die Rechtsgrundlage der
            Einwilligungen Art. 6 Abs. 1 lit. a. und Art. 7 DSGVO, die Rechtsgrundlage für die
            Verarbeitung zur Erfüllung unserer Leistungen und Durchführung vertraglicher Maßnahmen
            Art. 6 Abs. 1 lit. b. DSGVO, die Rechtsgrundlage für die Verarbeitung zur Erfüllung
            unserer rechtlichen Verpflichtungen Art. 6 Abs. 1 lit. c. DSGVO, und die
            Rechtsgrundlage für die Verarbeitung zur Wahrung unserer berechtigten Interessen Art.
            6 Abs. 1 lit. f. DSGVO ist.
          </p>
        </Section>

        <Section title="2. Sicherheitsmaßnahmen">
          <p>
            <strong>2.1</strong> Wir treffen organisatorische, vertragliche und technische
            Sicherheitsmaßnahmen entsprechend dem Stand der Technik, um sicherzustellen, dass die
            Vorschriften der Datenschutzgesetze eingehalten werden und um damit die durch uns
            verarbeiteten Daten gegen zufällige oder vorsätzliche Manipulationen, Verlust,
            Zerstörung oder gegen den Zugriff unberechtigter Personen zu schützen.
          </p>
          <p className="mt-4">
            <strong>2.2</strong> Zu den Sicherheitsmaßnahmen gehört insbesondere die
            verschlüsselte Übertragung von Daten zwischen Browser des Nutzers und unserem Server
            (SSL-Verschlüsselung).
          </p>
        </Section>

        <Section title="3. Weitergabe von Daten an Dritte und Drittanbieter">
          <p>
            <strong>3.1</strong> Eine Weitergabe von Daten an Dritte erfolgt nur im Rahmen der
            gesetzlichen Vorgaben. Wir geben die Daten der Nutzer an Dritte nur dann weiter, wenn
            dies z.B. auf Grundlage des Art. 6 Abs. 1 lit. b) DSGVO für Vertragszwecke
            erforderlich ist oder auf Grundlage berechtigter Interessen gem. Art. 6 Abs. 1 lit. f.
            DSGVO an wirtschaftlichem und effektivem Betrieb unseres Geschäftsbetriebes.
          </p>
          <p className="mt-4">
            <strong>3.2</strong> Sofern wir Subunternehmer einsetzen, um unsere Leistungen
            bereitzustellen, ergreifen wir geeignete rechtliche Vorkehrungen sowie entsprechende
            technische und organisatorische Maßnahmen, um für den Schutz der personenbezogenen
            Daten gemäß den einschlägigen gesetzlichen Vorschriften zu sorgen.
          </p>
          <p className="mt-4">
            <strong>3.3</strong> Sofern im Rahmen dieser Datenschutzerklärung Inhalte, Werkzeuge
            oder sonstige Mittel von anderen Anbietern (nachfolgend gemeinsam bezeichnet als
            „Drittanbieter") eingesetzt werden und deren genannter Sitz sich in einem Drittland
            befindet, ist davon auszugehen, dass ein Datentransfer in die Sitzstaaten der
            Drittanbieter stattfindet. Als Drittstaaten sind Länder zu verstehen, in denen die
            DSGVO kein unmittelbar geltendes Recht ist, d.h. grundsätzlich Länder außerhalb der
            EU, bzw. des Europäischen Wirtschaftsraums. Die Übermittlung von Daten in Drittstaaten
            erfolgt entweder, wenn ein angemessenes Datenschutzniveau, eine Einwilligung der
            Nutzer oder sonst eine gesetzliche Erlaubnis vorliegt.
          </p>
        </Section>

        <Section title="4. Kontaktaufnahme">
          <p>
            <strong>4.1</strong> Bei der Kontaktaufnahme mit uns (per Kontaktformular oder
            E-Mail) werden die Angaben des Nutzers zur Bearbeitung der Kontaktanfrage und deren
            Abwicklung gem. Art. 6 Abs. 1 lit. b) DSGVO verarbeitet.
          </p>
          <p className="mt-4">
            <strong>4.2</strong> Die Angaben der Nutzer können in unserem
            Customer-Relationship-Management System („CRM System") oder vergleichbarer
            Anfragenorganisation gespeichert werden.
          </p>
        </Section>

        <Section title="5. Erhebung von Zugriffsdaten und Logfiles">
          <p>
            <strong>5.1</strong> Wir erheben auf Grundlage unserer berechtigten Interessen im
            Sinne des Art. 6 Abs. 1 lit. f. DSGVO Daten über jeden Zugriff auf den Server, auf dem
            sich dieser Dienst befindet (sogenannte Serverlogfiles). Zu den Zugriffsdaten gehören
            Name der abgerufenen Webseite, Datei, Datum und Uhrzeit des Abrufs, übertragene
            Datenmenge, Meldung über erfolgreichen Abruf, Browsertyp nebst Version, das
            Betriebssystem des Nutzers, Referrer URL (die zuvor besuchte Seite), IP-Adresse und
            der anfragende Provider.
          </p>
          <p className="mt-4">
            <strong>5.2</strong> Logfile-Informationen werden aus Sicherheitsgründen (z.B. zur
            Aufklärung von Missbrauchs- oder Betrugshandlungen) für die Dauer von maximal sieben
            Tagen gespeichert und danach gelöscht. Daten, deren weitere Aufbewahrung zu
            Beweiszwecken erforderlich ist, sind bis zur endgültigen Klärung des jeweiligen
            Vorfalls von der Löschung ausgenommen.
          </p>
        </Section>

        <Section title="6. Cookies & Reichweitenmessung">
          <p>
            <strong>6.1</strong> Cookies sind Informationen, die von unserem Webserver oder
            Webservern Dritter an die Web-Browser der Nutzer übertragen und dort für einen
            späteren Abruf gespeichert werden. Bei Cookies kann es sich um kleine Dateien oder
            sonstige Arten der Informationsspeicherung handeln.
          </p>
          <p className="mt-4">
            <strong>6.2</strong> Über den Einsatz von Cookies im Rahmen pseudonymer
            Reichweitenmessung werden die Nutzer im Rahmen dieser Datenschutzerklärung informiert.
          </p>
          <p className="mt-4">
            <strong>6.3</strong> Falls die Nutzer nicht möchten, dass Cookies auf ihrem Rechner
            gespeichert werden, werden sie gebeten die entsprechende Option in den
            Systemeinstellungen ihres Browsers zu deaktivieren. Gespeicherte Cookies können in den
            Systemeinstellungen des Browsers gelöscht werden. Der Ausschluss von Cookies kann zu
            Funktionseinschränkungen dieses Onlineangebotes führen.
          </p>
          <p className="mt-4">
            <strong>6.4</strong> Sie können dem Einsatz von Cookies, die der Reichweitenmessung
            und Werbezwecken dienen, über die Deaktivierungsseite der Netzwerkwerbeinitiative
            (
            <a
              href="http://optout.networkadvertising.org/"
              className="underline underline-offset-2 hover:text-ink"
            >
              optout.networkadvertising.org
            </a>
            ) und zusätzlich die US-amerikanische Webseite (
            <a
              href="http://www.aboutads.info/choices"
              className="underline underline-offset-2 hover:text-ink"
            >
              aboutads.info/choices
            </a>
            ) oder die europäische Webseite (
            <a
              href="http://www.youronlinechoices.com/uk/your-ad-choices/"
              className="underline underline-offset-2 hover:text-ink"
            >
              youronlinechoices.com
            </a>
            ) widersprechen.
          </p>
        </Section>

        <Section title="7. Meta-, Custom Audiences und Meta-Marketing-Dienste">
          <p>
            <strong>7.1</strong> Innerhalb unseres Onlineangebotes wird aufgrund unserer
            berechtigten Interessen an Analyse, Optimierung und wirtschaftlichem Betrieb unseres
            Onlineangebotes und zu diesen Zwecken das sog. „Meta-Pixel" des sozialen Netzwerkes
            Meta, welches von der Meta Inc., 1 Hacker Way, Menlo Park, CA 94025, USA, bzw. falls
            Sie in der EU ansässig sind, Meta Ireland Ltd., 4 Grand Canal Square, Grand Canal
            Harbour, Dublin 2, Irland betrieben wird („Meta"), eingesetzt.
          </p>
          <p className="mt-4">
            <strong>7.2</strong> Meta ist unter dem Privacy-Shield-Abkommen zertifiziert und
            bietet hierdurch eine Garantie, das europäische Datenschutzrecht einzuhalten.
          </p>
          <p className="mt-4">
            <strong>7.3</strong> Mit Hilfe des Meta-Pixels ist es Meta zum einen möglich, die
            Besucher unseres Onlineangebotes als Zielgruppe für die Darstellung von Anzeigen (sog.
            „Meta-Ads") zu bestimmen. Dementsprechend setzen wir das Meta-Pixel ein, um die durch
            uns geschalteten Meta-Ads nur solchen Meta-Nutzern anzuzeigen, die auch ein Interesse
            an unserem Onlineangebot gezeigt haben oder die bestimmte Merkmale (z.B. Interessen
            an bestimmten Themen oder Produkten, die anhand der besuchten Webseiten bestimmt
            werden) aufweisen, die wir an Meta übermitteln (sog. „Custom Audiences"). Mit Hilfe
            des Meta-Pixels möchten wir auch sicherstellen, dass unsere Meta-Ads dem potentiellen
            Interesse der Nutzer entsprechen und nicht belästigend wirken. Mit Hilfe des
            Meta-Pixels können wir ferner die Wirksamkeit der Meta-Werbeanzeigen für statistische
            und Marktforschungszwecke nachvollziehen, in dem wir sehen ob Nutzer nachdem Klick auf
            eine Meta-Werbeanzeige auf unsere Website weitergeleitet wurden (sog. „Conversion").
          </p>
          <p className="mt-4">
            <strong>7.4</strong> Das Meta-Pixel wird beim Aufruf unserer Webseiten unmittelbar
            durch Meta eingebunden und kann auf dem Gerät des Nutzers ein sog. Cookie, d.h. eine
            kleine Datei abspeichern. Wenn der Nutzer sich anschließend bei Facebook einloggt oder
            im eingeloggten Zustand Facebook besucht, wird der Besuch unseres Onlineangebotes im
            Profil des Nutzers vermerkt. Die über den Nutzer erhobenen Daten sind für uns anonym,
            bieten uns also keine Rückschlüsse auf die Identität der Nutzer. Allerdings werden die
            Daten von Meta gespeichert und verarbeitet, sodass eine Verbindung zum jeweiligen
            Nutzerprofil möglich ist und von Meta sowie zu eigenen Marktforschungs- und
            Werbezwecken verwendet werden kann.
          </p>
          <p className="mt-4">
            <strong>7.5</strong> Die Verarbeitung der Daten durch Meta erfolgt im Rahmen von Metas
            Datenverwendungsrichtlinie. Generelle Hinweise zur Darstellung von Meta-Ads finden Sie
            in der Datenverwendungsrichtlinie von Facebook:{" "}
            <a
              href="https://www.facebook.com/policy.php"
              className="underline underline-offset-2 hover:text-ink"
            >
              facebook.com/policy.php
            </a>
            .
          </p>
          <p className="mt-4">
            <strong>7.6</strong> Nutzer können der Erfassung durch den Meta-Pixel und Verwendung
            der Nutzerdaten zur Darstellung von Meta-Ads widersprechen. Um einzustellen, welche
            Arten von Werbeanzeigen Ihnen innerhalb von Meta angezeigt werden, können Sie die von
            Meta eingerichtete Seite aufrufen:{" "}
            <a
              href="https://www.facebook.com/settings?tab=ads"
              className="underline underline-offset-2 hover:text-ink"
            >
              facebook.com/settings?tab=ads
            </a>
            . Die Einstellungen erfolgen plattformunabhängig, d.h. sie werden für alle Geräte, wie
            Desktopcomputer oder mobile Geräte übernommen.
          </p>
          <p className="mt-4">
            <strong>7.7</strong> Um die Erfassung personenbezogener Daten mittels des Meta-Pixels
            auf unserer Webseite zu verhindern, können Sie ein „Opt-Out"-Cookie auf Ihrem Gerät
            speichern. Wenn Sie die Cookies in diesem Browser löschen, müssen Sie das Opt-Out
            erneut setzen.
          </p>
          <p className="mt-4">
            <strong>7.8</strong> Man kann dem Einsatz von Cookies, die der Reichweitenmessung und
            Werbezwecken dienen, ferner über die Deaktivierungsseite der Netzwerkwerbeinitiative
            (
            <a
              href="https://optout.networkadvertising.org/?c=1"
              className="underline underline-offset-2 hover:text-ink"
            >
              optout.networkadvertising.org
            </a>
            ), die US-amerikanische Webseite (
            <a
              href="https://optout.aboutads.info/?c=2&lang=EN"
              className="underline underline-offset-2 hover:text-ink"
            >
              optout.aboutads.info
            </a>
            ) oder die europäische Webseite (
            <a
              href="http://www.youronlinechoices.com/uk/your-ad-choices/"
              className="underline underline-offset-2 hover:text-ink"
            >
              youronlinechoices.com
            </a>
            ) widersprechen.
          </p>
        </Section>

        <Section title="8. Einbindung von Diensten und Inhalten Dritter">
          <p>
            <strong>8.1</strong> Wir setzen innerhalb unseres Onlineangebotes auf Grundlage
            unserer berechtigten Interessen (d.h. Interesse an der Analyse, Optimierung und
            wirtschaftlichem Betrieb unseres Onlineangebotes im Sinne des Art. 6 Abs. 1 lit. f.
            DSGVO) Inhalts- oder Serviceangebote von Drittanbietern ein, um deren Inhalte und
            Services, wie z.B. Videos oder Schriftarten einzubinden (nachfolgend einheitlich
            bezeichnet als „Inhalte"). Dies setzt immer voraus, dass die Drittanbieter dieser
            Inhalte, die IP-Adresse der Nutzer wahrnehmen, da sie ohne die IP-Adresse die Inhalte
            nicht an deren Browser senden könnten. Die IP-Adresse ist damit für die Darstellung
            dieser Inhalte erforderlich. Wir bemühen uns nur solche Inhalte zu verwenden, deren
            jeweilige Anbieter die IP-Adresse lediglich zur Auslieferung der Inhalte verwenden.
          </p>
          <p className="mt-4">
            <strong>8.2</strong> Übersicht eingesetzter Drittanbieter:
          </p>
          <ul className="mt-4 ml-6 space-y-3 list-disc">
            <li>
              <span className="font-medium text-ink">Google Fonts</span> (Google Inc.) — externe
              Schriftarten. Die Einbindung erfolgt durch einen Serveraufruf bei Google (in der
              Regel in den USA).{" "}
              <a
                href="https://www.google.com/policies/privacy/"
                className="underline underline-offset-2 hover:text-ink"
              >
                Datenschutzerklärung
              </a>
              .
            </li>
            <li>
              <span className="font-medium text-ink">YouTube</span> (Google Inc.) — Videos.{" "}
              <a
                href="https://www.google.com/policies/privacy/"
                className="underline underline-offset-2 hover:text-ink"
              >
                Datenschutzerklärung
              </a>
              .
            </li>
            <li>
              <span className="font-medium text-ink">jQuery</span> (jQuery Foundation) — externer
              Code des JavaScript-Frameworks.
            </li>
          </ul>
        </Section>

        <Section title="9. Rechte der Nutzer">
          <p>
            <strong>9.1</strong> Nutzer haben das Recht, auf Antrag unentgeltlich Auskunft zu
            erhalten über die personenbezogenen Daten, die von uns über sie gespeichert wurden.
          </p>
          <p className="mt-4">
            <strong>9.2</strong> Zusätzlich haben die Nutzer das Recht auf Berichtigung
            unrichtiger Daten, Einschränkung der Verarbeitung und Löschung ihrer
            personenbezogenen Daten, sofern zutreffend, ihre Rechte auf Datenportabilität geltend
            zu machen und im Fall der Annahme einer unrechtmäßigen Datenverarbeitung, eine
            Beschwerde bei der zuständigen Aufsichtsbehörde einzureichen.
          </p>
          <p className="mt-4">
            <strong>9.3</strong> Ebenso können Nutzer Einwilligungen, grundsätzlich mit Auswirkung
            für die Zukunft, widerrufen.
          </p>
        </Section>

        <Section title="10. Löschung von Daten">
          <p>
            <strong>10.1</strong> Die bei uns gespeicherten Daten werden gelöscht, sobald sie für
            ihre Zweckbestimmung nicht mehr erforderlich sind und der Löschung keine gesetzlichen
            Aufbewahrungspflichten entgegenstehen. Sofern die Daten der Nutzer nicht gelöscht
            werden, weil sie für andere und gesetzlich zulässige Zwecke erforderlich sind, wird
            deren Verarbeitung eingeschränkt. D.h. die Daten werden gesperrt und nicht für andere
            Zwecke verarbeitet. Das gilt z.B. für Daten der Nutzer, die aus handels- oder
            steuerrechtlichen Gründen aufbewahrt werden müssen.
          </p>
          <p className="mt-4">
            <strong>10.2</strong> Nach gesetzlichen Vorgaben erfolgt die Aufbewahrung für 6 Jahre
            gemäß § 257 Abs. 1 HGB (Handelsbücher, Inventare, Eröffnungsbilanzen, Jahresabschlüsse,
            Handelsbriefe, Buchungsbelege, etc.) sowie für 10 Jahre gemäß § 147 Abs. 1 AO (Bücher,
            Aufzeichnungen, Lageberichte, Buchungsbelege, Handels- und Geschäftsbriefe, für
            Besteuerung relevante Unterlagen, etc.).
          </p>
        </Section>

        <Section title="11. Widerspruchsrecht">
          <p>
            Nutzer können der künftigen Verarbeitung ihrer personenbezogenen Daten entsprechend
            den gesetzlichen Vorgaben jederzeit widersprechen. Der Widerspruch kann insbesondere
            gegen die Verarbeitung für Zwecke der Direktwerbung erfolgen.
          </p>
        </Section>

        <Section title="12. Änderungen der Datenschutzerklärung">
          <p>
            <strong>12.1</strong> Wir behalten uns vor, die Datenschutzerklärung zu ändern, um sie
            an geänderte Rechtslagen, oder bei Änderungen des Dienstes sowie der Datenverarbeitung
            anzupassen. Dies gilt jedoch nur im Hinblick auf Erklärungen zur Datenverarbeitung.
            Sofern Einwilligungen der Nutzer erforderlich sind oder Bestandteile der
            Datenschutzerklärung Regelungen des Vertragsverhältnisses mit den Nutzern enthalten,
            erfolgen die Änderungen nur mit Zustimmung der Nutzer.
          </p>
          <p className="mt-4">
            <strong>12.2</strong> Die Nutzer werden gebeten sich regelmäßig über den Inhalt der
            Datenschutzerklärung zu informieren.
          </p>
        </Section>

        <p className="mt-12 text-sm text-muted">Stand: 01.05.2018</p>
      </article>

      <LegalFooter />
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

function LegalFooter() {
  return (
    <footer className="border-t border-ink/15">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        <span>© {new Date().getFullYear()} {STUDIO}</span>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/impressum" className="hover:text-ink">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-ink">Datenschutz</Link>
          <Link href="/agb" className="hover:text-ink">AGB</Link>
          <Link href="/teilnahmebedingungen" className="hover:text-ink">Teilnahmebedingungen</Link>
        </nav>
      </div>
    </footer>
  );
}
