import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudioId } from "@/lib/tenant";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ContactImportPage() {
  const studioId = await requireStudioId();
  const locations = await db.location.findMany({
    where: { studioId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

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
          Lade eine .xlsx-, .xls- oder .csv-Datei hoch, ordne die Spalten zu, wähle Status und
          Standort, lege fest wie mit Duplikaten umgegangen wird — fertig. Die Datei wird im
          Browser verarbeitet, an unseren Server gehen nur die fertigen Kontakt-Daten.
        </p>
      </div>

      <ImportForm locations={locations} />

      <div className="mt-16 max-w-2xl border-t border-ink/15 pt-8">
        <p className="label mb-3">Tipps</p>
        <ul className="space-y-2 text-sm text-muted leading-relaxed">
          <li>
            · Die <strong>erste Zeile</strong> der Datei muss die Spaltennamen enthalten (z.B.
            „E-Mail", „Vorname", „Geburtsdatum"). Diese werden automatisch erkannt.
          </li>
          <li>
            · <strong>Erkannte Spalten:</strong> E-Mail (Pflicht), Vorname, Nachname,
            Geschlecht, Geburtsdatum, Wohnort, Telefon.
          </li>
          <li>
            · Geschlecht wird automatisch erkannt aus „M/W/D" oder „männlich/weiblich/divers"
            (auch engl.).
          </li>
          <li>
            · Geburtsdatum akzeptiert „TT.MM.JJJJ", „JJJJ-MM-TT" oder Excel-Datumszelle.
          </li>
          <li>
            · Ungültige Mails und Datei-Duplikate werden übersprungen — Details siehst du nach
            dem Import.
          </li>
          <li>
            · Max. <strong>5000 Zeilen pro Datei</strong>. Mehr → in Häppchen splitten.
          </li>
        </ul>
      </div>
    </div>
  );
}
