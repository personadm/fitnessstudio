# WYSIWYG-Editor für Mails

Ersetzt den Markdown-basierten Editor durch einen echten WYSIWYG-Editor mit
**TipTap** (battle-tested React Editor, basiert auf ProseMirror).

## Features

- **Paste mit Formatierung** — Text aus Word, Pages, Browser einfach reinkopieren,
  Fett/Kursiv/Listen/Überschriften werden übernommen
- **Bilder an Cursor-Position** — Toolbar-Button "🖼 Bild" → File-Picker →
  Bild landet genau dort, wo der Cursor steht
- **Live-WYSIWYG** — du siehst beim Schreiben wie's später aussieht
- **Toolbar** — Fett, Kursiv, Durchgestrichen, H1/H2/Normal, Listen, Links,
  Bilder, Undo/Redo

## 1. NPM-Packages installieren

In `package.json` unter `dependencies` ergänzen:

```json
"@tiptap/extension-image": "^2.10.0",
"@tiptap/extension-link": "^2.10.0",
"@tiptap/pm": "^2.10.0",
"@tiptap/react": "^2.10.0",
"@tiptap/starter-kit": "^2.10.0"
```

**Achtung Komma-Falle:** Schau dass nach `"mammoth": "^1.8.0"` ein Komma steht
bevor du den nächsten Eintrag dazu setzt — sonst klassischer JSON-Parse-Error
beim Build.

Beispiel wie's am Ende von `dependencies` aussieht:

```json
{
  "dependencies": {
    "...",
    "resend": "^4.0.1",
    "zod": "^3.24.1",
    "mammoth": "^1.8.0",
    "@tiptap/extension-image": "^2.10.0",
    "@tiptap/extension-link": "^2.10.0",
    "@tiptap/pm": "^2.10.0",
    "@tiptap/react": "^2.10.0",
    "@tiptap/starter-kit": "^2.10.0"
  }
}
```

Render macht beim nächsten Build automatisch `npm install` und zieht die
Packages.

## 2. Files hochladen

3 Files aus dem ZIP ins Repo:

```
src/components/admin/RichTextEditor.tsx       (NEU)
src/components/admin/ManualEmailComposer.tsx  (ersetzt bestehend)
src/app/admin/(authed)/funnels/[id]/steps/[stepId]/EditStepForm.tsx  (ersetzt bestehend)
```

## 3. Commit

```
WYSIWYG-Editor mit TipTap — Paste mit Formatierung + Bild einfügen
```

Render baut, Packages werden installiert, Editor ist live.

## Wie's funktioniert

### Beim neuen Funnel-Step ("Selbst schreiben"-Tab)

1. Cursor im Editor-Bereich platzieren
2. Loslegen — Buttons in der Toolbar oben für Fett/Kursiv/Listen
3. Aus Word/Pages reinkopieren: Strg+V (oder Cmd+V) — Formatierung bleibt
4. Bild einfügen: Cursor an die richtige Stelle → "🖼 Bild" → File auswählen
5. Link: Text markieren → "🔗 Link" → URL eingeben

### Bestehenden Step bearbeiten

Der gespeicherte HTML-Inhalt wird direkt geladen. Bilder, Links, alles bleibt
wie's war. Du kannst direkt drauflos bearbeiten.

## Bilder — wichtig zu wissen

Bilder werden als **Base64 inline** ins Mail-HTML eingebettet. Vorteile:

- Keine externe Storage-Lösung nötig (kein S3, kein CDN)
- Bilder sind Teil der Mail — bleiben sichtbar, auch wenn dein Server down ist
- Funktioniert in allen Mail-Clients

Nachteil: Mails werden bei vielen großen Bildern groß.

**Limits:**

- Pro Bild: 4 MB (im Editor durchgesetzt)
- Pro Mail: Resend erlaubt etwa 10 MB Gesamtgröße — passt für 2-3 normale Bilder
- Empfehlung: vorher mit z.B. tinypng.com oder dem Mac-„Vorschau" → „Exportieren"
  komprimieren

## Was passiert mit dem alten Markdown-System

Die alte `mailContent.ts` mit `htmlToEditableText`/`editableTextToHtml` wird
für die Funnel-Steps nicht mehr genutzt. Du kannst sie liegen lassen — keine
Daten-Migration nötig, weil dein bestehendes `bodyHtml` in der DB schon
HTML war.

## Was nicht enthalten ist (für später)

- **Newsletter-Send-Page** falls separat — gleiches Pattern, sag Bescheid
  wenn du das auch umstellen willst, ist dann eine kleine Folge-Lieferung
- **Bild-Resize per Drag** — TipTap kann's, brauchst aber zusätzliche
  Extension. Aktuell: Bild wird auf max. Spaltenbreite skaliert
- **Drag & Drop von Bildern direkt in den Editor** — würde zusätzliches Setup
  brauchen. Aktuell: über den Toolbar-Button

Sag Bescheid wenn du eines davon willst.
