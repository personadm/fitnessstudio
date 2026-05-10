import Link from "next/link";

const STUDIO = process.env.STUDIO_NAME ?? "Studio Iron";

export const metadata = {
  title: "Teilnahmebedingungen",
  description: "Bedingungen für die Teilnahme an Online-Sonderaktionen.",
};

export default function TeilnahmebedingungenPage() {
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
          Teilnahme&shy;bedingungen
        </h1>

        <Section title="Verantwortlicher Veranstalter">
          <div className="space-y-1">
            <p className="font-medium text-ink">Villa-Fit</p>
            <p>Erhardstr. 2, 48683 Ahaus</p>
            <p>
              E-Mail:{" "}
              <a
                href="mailto:club-ahaus@gesundheitscoaches.de"
                className="underline underline-offset-2 hover:text-ink"
              >
                club-ahaus@gesundheitscoaches.de
              </a>
            </p>
            <p>
              Telefon:{" "}
              <a href="tel:02561961166" className="underline underline-offset-2 hover:text-ink">
                02561 961166
              </a>
            </p>
            <p>
              Web:{" "}
              <a
                href="https://www.gesundheitscoaches.de/"
                className="underline underline-offset-2 hover:text-ink"
              >
                https://www.gesundheitscoaches.de/
              </a>
            </p>
          </div>
        </Section>

        <Section title="Umsetzung">
          <div className="space-y-1">
            <p className="font-medium text-ink">FACEFORCE GmbH</p>
            <p>
              Web:{" "}
              <a
                href="https://www.face-force.de"
                className="underline underline-offset-2 hover:text-ink"
              >
                https://www.face-force.de
              </a>
            </p>
            <p>
              Telefon:{" "}
              <a href="tel:+4906819659244" className="underline underline-offset-2 hover:text-ink">
                +49 (0) 681 9659 24 20
              </a>
            </p>
          </div>
        </Section>

        <Section title="Nutzungsbedingungen und Richtlinien">
          <p>
            Für die Teilnahme an von Villa-Fit Ahaus veranstalteten Online-Sonderaktionen gelten
            folgende Bedingungen:
          </p>

          <ol className="mt-6 space-y-6 list-decimal ml-5">
            <li>
              Jeder Teilnehmer akzeptiert mit seiner Teilnahme diese Allgemeinen
              Teilnahmebedingungen und alle ggf. bekannt gemachten besonderen
              Teilnahmebedingungen oder Regeln der Aktion.
            </li>
            <li>
              Teilnahmeberechtigt ist jede natürliche Person, die das 18. Lebensjahr vollendet und
              ihren ständigen Wohnsitz in Deutschland, Österreich, der Schweiz oder Luxemburg hat.
              Von der Teilnahme ausgeschlossen sind Mitarbeiter von Villa-Fit Ahaus sowie deren
              damit verbundene Unternehmen, Mitarbeiter von Kooperationspartnern der jeweiligen
              Sonderaktion und alle Personen, welche mit der Durchführung der Sonderaktion
              beschäftigt sind oder waren. Gleiches gilt für Angehörige ersten und zweiten Grades
              dieser Personen sowie deren Lebenspartner in eheähnlicher Gemeinschaft. Sollte trotz
              des Ausschlusses eine Teilnahme erfolgen, ist eine Ausschüttung nicht möglich.
            </li>
            <li>
              Jeder Teilnehmer erklärt sich mit der Teilnahme damit einverstanden, dass seine für
              die Aktion notwendigen persönlichen Daten (Geburtsdatum, Alter, Vorname und Name,
              Telefonnummer, Wohnungsanschrift) auf elektronischen Datenträgern gespeichert und
              für Marketingzwecke unter Einhaltung der gesetzlichen Datenschutzbestimmungen von
              Villa-Fit Ahaus verwendet werden dürfen. Der Teilnehmer sichert mit seiner Teilnahme
              zu, dass alle von ihm gemachten Angaben der Wahrheit entsprechen. Wurde vom
              Teilnehmer das Einverständnis zur Verwendung der persönlichen Daten für interne
              Marketingzwecke (z.B. Newsletter und besondere Angebote etc.) erteilt, so werden die
              Daten an Villa-Fit Ahaus übermittelt.
            </li>
            <li>Sachpreise/Boni können nicht in Bargeld ausgezahlt werden.</li>
            <li>
              Ist zur Teilnahme die Erstellung und Übermittlung eines Werkes erforderlich (z.B.
              Foto, Video, schriftliche Bewerbung oder anderweitige Dateien etc.), erklärt sich
              der Teilnehmer mit der Teilnahme einverstanden, dass diese Werke von Villa-Fit Ahaus
              im Rahmen oder für Zwecke der betreffenden Aktion sowie für weitere Werbezwecke
              zeitlich, inhaltlich und räumlich unbegrenzt genutzt und veröffentlicht werden
              dürfen (z.B. im Hörfunk, Internet, TV etc.) und dies ohne Zahlung eines Entgeltes an
              den Teilnehmer. Der Teilnehmer erteilt Villa-Fit Ahaus insofern nicht exklusiv die
              erforderlichen Rechte am Werk. Dem Teilnehmer ist bewusst, dass diese Rechteerteilung
              die Bearbeitung des Werkes (z.B. durch Teilauswertung, sendetechnische Aufbereitung,
              Zusammenfassung mehrerer Werke etc.) beinhaltet und erklärt sich hiermit durch seine
              Teilnahme einverstanden. Sind mehrere Personen an der Erstellung des Werkes
              beteiligt (z.B. sichtbar, hörbar), so garantiert der Teilnehmer mit seiner
              Einsendung, dass alle beteiligten Personen ihm gegenüber das Einverständnis an der
              Übersendung und damit an der Einräumung der oben beschriebenen Rechte unwiderruflich
              versichert haben und insofern mit der Übermittlung des Werkes und der
              Rechteerteilung einverstanden sind. Weiterhin versichert der Teilnehmer bei der
              Erstellung des Werkes keine Rechte Dritter verletzt zu haben. Der Teilnehmer haftet
              insofern gegenüber Villa-Fit Ahaus und stellt diese gegenüber den Ansprüchen Dritter
              frei. Villa-Fit Ahaus ist zur Veröffentlichung der übermittelten Werke nicht
              verpflichtet.
            </li>
            <li>
              Villa-Fit Ahaus hat das Recht, solche Teilnehmer von der Teilnahme an der Aktion
              auszuschließen, die den Teilnahmevorgang, die Aktion und/oder das Angebot
              manipulieren bzw. zu manipulieren versuchen, schuldhaft gegen Teilnahmeregeln
              verstoßen oder sonst in unlauterer Weise versuchen, die Aktion und/oder den
              Teilnahmevorgang zu beeinflussen, insbesondere durch Störung, Bedrohung und/oder
              Belästigung von Mitarbeitern von Villa-Fit Ahaus oder von anderen Teilnehmern an der
              Aktion. In solchen Fällen ist Villa-Fit Ahaus berechtigt, ausgezahlte Gewinne
              nachträglich abzuerkennen und zurückzufordern.
            </li>
            <li>
              Villa-Fit Ahaus behält sich vor, eine Aktion jederzeit abzubrechen oder deren
              Ablaufregeln für die Zukunft zu ändern. Dies gilt insbesondere bei höherer Gewalt
              sowie dann, wenn die Aktion aus anderen organisatorischen, technischen oder
              rechtlichen Gründen nicht durchgeführt bzw. fortgesetzt werden kann.
            </li>
            <li>
              Die Haftung von Villa-Fit Ahaus für falsche Aussagen im Rahmen der Aktion ist
              ausgeschlossen, es sei denn, Villa-Fit Ahaus bzw. ein Erfüllungsgehilfe von
              Villa-Fit Ahaus handelt vorsätzlich oder grob fahrlässig.
            </li>
            <li>
              Das Unternehmen Villa-Fit Ahaus behält sich das Recht vor, bei wiederholter
              Teilnahme von Personen diese vom vorliegenden Angebot auszuschließen.
            </li>
            <li>
              Der Rechtsweg ist ausgeschlossen. Es ist ausschließlich das Recht der Bundesrepublik
              Deutschland anwendbar. Sollten einzelne dieser Bestimmungen ungültig sein oder
              werden, bleibt die Gültigkeit der übrigen Nutzungsbedingungen hiervon unberührt.
            </li>
          </ol>
        </Section>
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
