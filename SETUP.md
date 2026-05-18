# Pages-/Word-Import für Funnel-Mails

## Was das macht

Du kannst in Pages eine Mail komplett fertig schreiben (mit Bildern, Formatierung, Listen, Links) und sie dann ohne Copy-Paste in einen Funnel-Schritt importieren.

## Einmaliges Setup

In deinem Projekt-Ordner lokal **einmal** dieses Kommando ausführen:

```bash
npm install mammoth
```

Das fügt `mammoth` zur `package.json` hinzu — eine bewährte Library die Word-Dokumente in HTML konvertiert (inkl. Bilder).

Nach dem Push deployt Render automatisch und installiert die Lib mit.

## Alternative falls du nicht mit der Kommandozeile arbeiten willst

In GitHub direkt: öffne `package.json` → in den `dependencies`-Block einfügen:

```json
"mammoth": "^1.8.0"
```

Beim nächsten Render-Build wird die Library automatisch installiert.

## Workflow danach

1. **In Pages:** deine Mail fertig schreiben — mit Bildern, fett/kursiv, Listen, Links, allem
2. **Pages → Ablage → Exportieren als → Word** → speichern als `.docx`
3. **Im Funnel-Editor:** neuen Schritt anlegen → Tab `📄 Aus Pages-Datei` wählen
4. **Betreff eingeben** und die .docx-Datei hochladen
5. **Vorschau prüfen** — siehst du, wie's später aussehen wird
6. **"Mail übernehmen →"** klicken — wird ins Step-Form gelegt
7. **Schritt anlegen** wie üblich

## Was übernommen wird

| Pages | → | Mail |
|---|---|---|
| Fließtext | → | `<p>` |
| Fettdruck | → | `<strong>` |
| Kursiv | → | `<em>` |
| Listen (Aufzählungen) | → | `<ul>/<li>` |
| Links | → | `<a href>` |
| Überschriften (Heading 1, 2…) | → | `<h1>/<h2>` |
| Eingebettete Bilder | → | `<img>` als base64 (inline in Mail) |
| Tabellen | → | meistens — Mammoth handhabt einfache Tabellen |

## Was NICHT übernommen wird

- Spezielle Pages-Features (Spalten, Textboxen, komplexe Layouts)
- Schriftarten (werden von Mailclients sowieso oft ignoriert)
- Zeichnungen / Shapes

Falls du komplexe Layouts brauchst: nimm eher den **„Selbst schreiben"-Modus** und lade Bilder separat hoch. Das ist kontrollierbarer.

## Wenn beim Import Warnungen kommen

Im Import-Dialog erscheinen ggf. „Hinweise beim Import" — Mammoth nennt da typischerweise unbekannte Style-Definitionen die ignoriert werden. Das ist **kein Fehler**, nur Info. Die Mail kommt trotzdem korrekt rüber.

## Files in diesem ZIP

- `src/app/api/admin/import-docx/route.ts` (NEU) — Server-Endpoint
- `src/components/admin/DocxImporter.tsx` (NEU) — Upload-UI mit Vorschau
- `src/components/admin/EmailComposer.tsx` (ersetzen) — neuer Tab dazu
- `SETUP.md` — dieses File

## Hochladen

1. ZIP entpacken
2. **Erst** `npm install mammoth` lokal (oder die Zeile in `package.json` von Hand hinzufügen)
3. GitHub → 3 Code-Dateien aus dem `src/` reinziehen
4. Commit: `Funnel-Mails: Import aus Pages/Word-Dokument`
5. Render baut neu, installiert mammoth, Feature ist live
