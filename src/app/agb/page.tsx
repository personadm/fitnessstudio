import Link from "next/link";

const STUDIO = process.env.STUDIO_NAME ?? "Studio Iron";

export const metadata = {
  title: "Allgemeine Geschäftsbedingungen",
  description: "AGB und Kundeninformationen.",
};

export default function AgbPage() {
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
        <h1 className="text-display-italic text-5xl md:text-6xl leading-[0.95] mb-12">
          Allgemeine Geschäftsbedingungen und Kundeninformationen
        </h1>

        {/* Inhaltsverzeichnis */}
        <nav className="mb-16 border-l-2 pl-6 border-ink/15">
          <p className="label mb-4">Inhalt</p>
          <ol className="text-display text-base leading-relaxed text-ink-soft space-y-1 list-decimal ml-5">
            <li>Geltungsbereich</li>
            <li>Angebote und Leistungsbeschreibungen</li>
            <li>Bestellvorgang und Vertragsabschluss</li>
            <li>Preise und Versandkosten</li>
            <li>Lieferung, Warenverfügbarkeit</li>
            <li>Zahlungsmodalitäten</li>
            <li>Eigentumsvorbehalt</li>
            <li>Sachmängelgewährleistung und Garantie</li>
            <li>Weitergehende Haftung</li>
            <li>Speicherung des Vertragstextes</li>
            <li>Schlussbestimmungen</li>
          </ol>
        </nav>

        <Section title="1. Geltungsbereich">
          <p>
            <strong>1.1</strong> Für die Geschäftsbeziehung zwischen Villa-Fit Ahaus (nachfolgend
            „Verkäufer") und dem Kunden (nachfolgend „Kunde") gelten ausschließlich die
            nachfolgenden Allgemeinen Geschäftsbedingungen in ihrer zum Zeitpunkt der Bestellung
            gültigen Fassung.
          </p>
          <p className="mt-4">
            <strong>1.2</strong> Sie können uns persönlich für Fragen, Reklamationen und
            Beanstandungen per E-Mail unter{" "}
            <a
              href="mailto:club-ahaus@gesundheitscoaches.de"
              className="underline underline-offset-2 hover:text-ink"
            >
              club-ahaus@gesundheitscoaches.de
            </a>{" "}
            kontaktieren.
          </p>
          <p className="mt-4">
            <strong>1.3</strong> Verbraucher im Sinne dieser AGB ist jede natürliche Person, die
            ein Rechtsgeschäft zu einem Zwecke abschließt, der überwiegend weder ihrer
            gewerblichen noch ihrer selbstständigen beruflichen Tätigkeit zugerechnet werden kann
            (§ 13 BGB).
          </p>
          <p className="mt-4">
            <strong>1.4</strong> Abweichende Bedingungen des Kunden werden nicht anerkannt, es sei
            denn, der Verkäufer stimmt ihrer Geltung ausdrücklich zu.
          </p>
        </Section>

        <Section title="2. Angebote und Leistungsbeschreibungen">
          <p>
            Die Darstellung der Produkte im Online-Shop stellt kein rechtlich bindendes Angebot,
            sondern eine Aufforderung zur Abgabe einer Bestellung dar. Leistungsbeschreibungen auf
            den Websites des Verkäufers haben nicht den Charakter einer Zusicherung oder Garantie.
          </p>
          <p className="mt-4">
            Alle Angebote gelten „solange der Vorrat reicht", wenn nicht bei den Produkten etwas
            anderes vermerkt ist. Im Übrigen bleiben Irrtümer vorbehalten.
          </p>
        </Section>

        <Section title="3. Bestellvorgang und Vertragsabschluss">
          <p>
            <strong>3.1</strong> Der Kunde kann aus dem Sortiment des Verkäufers Produkte
            unverbindlich auswählen und gelangt durch Klicken auf die Schaltfläche „Auswählen" zum
            weiteren Buchungsprozess. Nach Eingabe der persönlichen Daten gelangt der Kunde
            innerhalb des Buchungsprozesses über die „Angebot sichern"-Schaltfläche zur Auswahl
            der Versandarten und der Festlegung der Zahlungsinformationen zum Abschluss des
            Bestellvorgangs.
          </p>
          <p className="mt-4">
            <strong>3.2</strong> Über die Schaltfläche „Bestellung aufgeben" gibt der Kunde einen
            verbindlichen Antrag zum Kauf der ausgewählten Waren oder Dienstleistungen ab. Vor
            Abschicken der Bestellung kann der Kunde die Daten jederzeit ändern und einsehen sowie
            mithilfe der Browserfunktion den Bestellvorgang insgesamt abbrechen. Notwendige
            Angaben sind mit einem Sternchen (*) gekennzeichnet.
          </p>
          <p className="mt-4">
            <strong>3.3</strong> Der Verkäufer schickt daraufhin dem Kunden eine automatische
            Empfangsbestätigung per E-Mail zu, in welcher die Bestellung des Kunden nochmals
            aufgeführt wird und die der Kunde über die Funktion „Drucken" ausdrucken kann
            (Bestellbestätigung). Die automatische Empfangsbestätigung dokumentiert lediglich,
            dass die Bestellung des Kunden beim Verkäufer eingegangen ist und stellt keine Annahme
            des Antrags dar. Der Kaufvertrag kommt erst dann zustande, wenn der Verkäufer das
            bestellte Produkt innerhalb von 2 Tagen an den Kunden versendet, übergeben oder den
            Versand an den Kunden innerhalb von 2 Tagen mit einer zweiten E-Mail, ausdrücklicher
            Auftragsbestätigung oder Zusendung der Rechnung bestätigt hat.
          </p>
          <p className="mt-4">
            <strong>3.4</strong> Sollte der Verkäufer eine Vorkassezahlung ermöglichen, kommt der
            Vertrag mit der Bereitstellung der Bankdaten und Zahlungsaufforderung zustande. Wenn
            die Zahlung trotz Fälligkeit auch nach erneuter Aufforderung nicht bis zu einem
            Zeitpunkt von 10 Kalendertagen nach Absendung der Bestellbestätigung beim Verkäufer
            eingegangen ist, tritt der Verkäufer vom Vertrag zurück mit der Folge, dass die
            Bestellung hinfällig ist und den Verkäufer keine Lieferpflicht trifft. Die Bestellung
            ist dann für den Käufer und Verkäufer ohne weitere Folgen erledigt. Eine Reservierung
            des Artikels bei Vorkassezahlungen erfolgt daher längstens für 10 Kalendertage.
          </p>
        </Section>

        <Section title="4. Preise und Versandkosten">
          <p>
            <strong>4.1</strong> Alle Preise, die auf der Website des Verkäufers angegeben sind,
            verstehen sich einschließlich der jeweils gültigen gesetzlichen Umsatzsteuer.
          </p>
          <p className="mt-4">
            <strong>4.2</strong> Zusätzlich zu den angegebenen Preisen berechnet der Verkäufer für
            die Lieferung Versandkosten. Die Versandkosten werden dem Käufer auf einer gesonderten
            Informationsseite und im Rahmen des Bestellvorgangs deutlich mitgeteilt.
          </p>
        </Section>

        <Section title="5. Lieferung, Warenverfügbarkeit">
          <p>
            <strong>5.1</strong> Soweit Vorkasse vereinbart ist, erfolgt die Lieferung nach
            Eingang des Rechnungsbetrages.
          </p>
          <p className="mt-4">
            <strong>5.2</strong> Sollte die Zustellung der Ware durch Verschulden des Käufers
            trotz dreimaligem Auslieferversuchs scheitern, kann der Verkäufer vom Vertrag
            zurücktreten. Ggf. geleistete Zahlungen werden dem Kunden unverzüglich erstattet.
          </p>
          <p className="mt-4">
            <strong>5.3</strong> Wenn das bestellte Produkt nicht verfügbar ist, weil der
            Verkäufer mit diesem Produkt von seinem Lieferanten ohne eigenes Verschulden nicht
            beliefert wird, kann der Verkäufer vom Vertrag zurücktreten. In diesem Fall wird der
            Verkäufer den Kunden unverzüglich informieren und ihm ggf. die Lieferung eines
            vergleichbaren Produktes vorschlagen. Wenn kein vergleichbares Produkt verfügbar ist
            oder der Kunde keine Lieferung eines vergleichbaren Produktes wünscht, wird der
            Verkäufer dem Kunden ggf. bereits erbrachte Gegenleistungen unverzüglich erstatten.
          </p>
          <p className="mt-4">
            <strong>5.4</strong> Kunden werden über Lieferzeiten und Lieferbeschränkungen (z.B.
            Beschränkung der Lieferungen auf bestimmte Länder) auf einer gesonderten
            Informationsseite oder innerhalb der jeweiligen Produktbeschreibung unterrichtet.
          </p>
        </Section>

        <Section title="6. Zahlungsmodalitäten">
          <p>
            <strong>6.1</strong> Der Kunde kann im Rahmen und vor Abschluss des Bestellvorgangs
            aus den zur Verfügung stehenden Zahlungsarten wählen. Kunden werden über die zur
            Verfügung stehenden Zahlungsmittel auf einer gesonderten Informationsseite
            unterrichtet.
          </p>
          <p className="mt-4">
            <strong>6.2</strong> Ist die Bezahlung per Rechnung möglich, hat die Zahlung innerhalb
            von 15 Tagen nach Erhalt der Ware und der Rechnung zu erfolgen. Bei allen anderen
            Zahlweisen hat die Zahlung im Voraus ohne Abzug zu erfolgen.
          </p>
          <p className="mt-4">
            <strong>6.3</strong> Werden Drittanbieter mit der Zahlungsabwicklung beauftragt, z.B.
            Paypal, gelten deren Allgemeine Geschäftsbedingungen.
          </p>
          <p className="mt-4">
            <strong>6.4</strong> Ist die Fälligkeit der Zahlung nach dem Kalender bestimmt, so
            kommt der Kunde bereits durch Versäumung des Termins in Verzug. In diesem Fall hat der
            Kunde die gesetzlichen Verzugszinsen zu zahlen.
          </p>
          <p className="mt-4">
            <strong>6.5</strong> Die Verpflichtung des Kunden zur Zahlung von Verzugszinsen
            schließt die Geltendmachung weiterer Verzugsschäden durch den Verkäufer nicht aus.
          </p>
          <p className="mt-4">
            <strong>6.6</strong> Ein Recht zur Aufrechnung steht dem Kunden nur zu, wenn seine
            Gegenansprüche rechtskräftig festgestellt oder von dem Verkäufer anerkannt sind. Der
            Kunde kann ein Zurückbehaltungsrecht nur ausüben, soweit die Ansprüche aus dem
            gleichen Vertragsverhältnis resultieren.
          </p>
        </Section>

        <Section title="7. Eigentumsvorbehalt">
          <p>
            Bis zur vollständigen Bezahlung verbleiben die gelieferten Waren im Eigentum des
            Verkäufers.
          </p>
        </Section>

        <Section title="8. Sachmängelgewährleistung und Garantie">
          <p>
            <strong>8.1</strong> Die Gewährleistung bestimmt sich nach gesetzlichen Vorschriften.
          </p>
          <p className="mt-4">
            <strong>8.2</strong> Eine Garantie besteht bei den vom Verkäufer gelieferten Waren
            nur, wenn diese ausdrücklich abgegeben wurde. Kunden werden über die
            Garantiebedingungen vor der Einleitung des Bestellvorgangs informiert.
          </p>
        </Section>

        <Section title="9. Weitergehende Haftung">
          <p>
            <strong>9.1</strong> Schadenersatzansprüche gegen den Verkäufer aus Unmöglichkeit der
            Leistung, aus positiver Vertragsverletzung, aus Verschulden bei Vertragsabschluss und
            aus unerlaubter Handlung sind ausgeschlossen, soweit nicht vorsätzliches oder grob
            fahrlässiges Handeln vorliegt.
          </p>
          <p className="mt-4">
            <strong>9.2</strong> Die in diesen Allgemeinen Geschäftsbedingungen vorgenannten
            Haftungsbeschränkungen gelten nicht bei Verletzung des Lebens, des Körpers oder der
            Gesundheit, die auf einer vorsätzlichen oder fahrlässigen Pflichtverletzung des
            Verkäufers oder einer vorsätzlichen oder fahrlässigen Pflichtverletzung eines
            gesetzlichen Vertreters oder Erfüllungsgehilfen des Verkäufers beruhen.
          </p>
        </Section>

        <Section title="10. Speicherung des Vertragstextes">
          <p>
            <strong>10.1</strong> Der Kunde kann den Vertragstext vor der Abgabe der Bestellung an
            den Verkäufer ausdrucken, indem er im letzten Schritt der Bestellung die Druckfunktion
            seines Browsers nutzt.
          </p>
          <p className="mt-4">
            <strong>10.2</strong> Der Verkäufer sendet dem Kunden außerdem eine
            Bestellbestätigung mit allen Bestelldaten an die von ihm angegebene E-Mail-Adresse zu.
            Die AGB sowie das Widerrufsrecht sind vor Abschluss der Bestellung sowie über einen
            separaten Link über die Startseite des Online-Shop Bereiches einsehbar. Vor Abschluss
            der Bestellung muss der Kunde durch das Setzen eines Hakens bestätigen, dass er die
            Allgemeinen Geschäftsbedingungen gelesen hat und diese akzeptiert. Die Allgemeinen
            Geschäftsbedingungen sind jederzeit auf der Website einsehbar. Auch das
            Widerrufsformular kann jederzeit über die Website heruntergeladen werden. Mit der
            Bestellbestätigung, spätestens jedoch bei der Lieferung der Ware, erhält der Kunde
            ferner eine Kopie der AGB nebst Widerrufsbelehrung und den Hinweisen zu Versandkosten
            sowie Liefer- und Zahlungsbedingungen. Darüber hinaus speichern wir den Vertragstext,
            machen ihn jedoch im Internet nicht zugänglich.
          </p>
        </Section>

        <Section title="11. Schlussbestimmungen">
          <p>
            <strong>11.1</strong> Ist der Besteller Vollkaufmann, ist der Gerichtsstand und
            Erfüllungsort Ahaus.
          </p>
          <p className="mt-4">
            <strong>11.2</strong> Sollte eine Bestimmung dieser Geschäftsbedingungen unwirksam
            sein, so wird dadurch die Gültigkeit der übrigen Bestimmungen nicht berührt.
          </p>
          <p className="mt-4">
            <strong>11.3</strong> Auf alle Rechtsbeziehungen und Ansprüche zwischen Bestellern und
            des Verkäufers ist, soweit gesetzlich zulässig, ausschließlich deutsches Recht
            anwendbar.
          </p>
        </Section>

        <p className="mt-16 text-sm text-muted">
          Villa-Fit Ahaus · Erhardstr. 2 · 48683 Ahaus · Stand: 07.05.2026
        </p>
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
