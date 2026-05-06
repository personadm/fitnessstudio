import Link from "next/link";
import { ImportForm } from "./ImportForm";

export default function ContactImportPage() {
  return (
    <div className="p-8 md:p-12">
      <Link
        href="/admin/contacts"
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
      >
        ← Zurück zu Kontakten
      </Link>

      <div className="mt-6 mb-12">
        <p className="label">Import</p>
        <h1 className="mt-2 text-display text-5xl">Excel-Liste einlesen</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted leading-relaxed">
          Lade eine .xlsx-, .xls- oder .csv-Datei hoch, ordne die Spalten zu, wähle den Status und
          den Umgang mit Duplikaten — fertig. Die Datei wird im Browser verarbeitet, an unseren
          Server gehen nur die fertigen Kontakt-Daten.
        </p>
      </div>

      <ImportForm />

      <div className="mt-16 max-w-2xl border-t border-ink/15 pt-8">
        <p className="label mb-3">Tipps</p>
        <ul className="space-y-2 text-sm text-muted leading-relaxed">
          <li>
            · Die <strong>erste Zeile</strong> der Datei muss die Spaltennamen enthalten (z.B.
            „E-Mail", „Vorname", „Nachname"). Diese werden automatisch erkannt.
          </li>
          <li>
            · Mindestens eine Spalte mit E-Mail-Adressen ist Pflicht. Vor- und Nachname sind
            optional.
          </li>
          <li>
            · Geschlecht wird automatisch erkannt aus „M/W/D" oder „männlich/weiblich/divers" (und
            engl. Varianten).
          </li>
          <li>
            · Ungültige Mail-Adressen und doppelte Einträge in der Datei werden übersprungen — du
            siehst die Details nach dem Import.
          </li>
          <li>
            · Es können maximal <strong>5000 Zeilen pro Datei</strong> verarbeitet werden. Bei mehr
            einfach in Häppchen splitten.
          </li>
        </ul>
      </div>
    </div>
  );
}
