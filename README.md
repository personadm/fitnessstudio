# Komplett-Update — 6 Dateien

Alles in dieser Lieferung muss hochgeladen werden. Pfade stimmen 1:1.

## Datei-Liste

| Datei | Status | Was sich ändert |
|---|---|---|
| `src/components/admin/RichTextEditor.tsx` | Update | Bild-Insert-Bug behoben — Bilder lassen sich jetzt mehrfach einfügen |
| `src/lib/mail.ts` | Update | Mail-Footer: „Laurenzstr. 98" (statt „Lauchenstraße"), Telefon Villa-Fit korrigiert auf 02561 961166 (war 9611166) |
| `src/app/impressum/page.tsx` | Update | Inhalt aus dem PDF: Vital-Fit GmbH, Erik Bodon, korrekte USt-IdNr und HRB |
| `src/app/datenschutz/page.tsx` | Update | Komplette neue Datenschutzerklärung aus dem PDF |
| `src/app/teilnahmebedingungen/page.tsx` | Update | Komplette neuen Teilnahmebedingungen aus dem PDF |
| `src/app/agb/page.tsx` | Update | Komplette neue AGB aus dem PDF |

## Bild-Insert: was war kaputt

Der TipTap-Befehl `setImage()` **ersetzt die aktuelle Selection**. Nach dem
Einfügen des ersten Bildes war das Bild „selected" — beim nächsten Klick auf
„Bild" wurde das vorherige durch das neue ersetzt.

**Fix:** Statt `setImage()` jetzt `insertContentAt(endPos, ...)` — fügt Paragraph
+ Bild + Paragraph am Ende des Dokuments an. Cursor landet im letzten leeren
Paragraph, sodass das nächste Bild garantiert ein neues wird.

## Newsletter-Versand: was du beobachtet hast

> *„Die 2. Email ging zwar raus, kam aber nicht bei mir an.
> Die Email kann auch für einen weiteren Versand nicht bearbeitet werden."*

Zwei verschiedene Sachen:

**1) Mail kam nicht an** — Empfänger die schon einmal eine Mail dieser Kampagne
bekommen haben, bekommen **per Design keine zweite**. Das schützt vor
Doppel-Spam und ist über die Datenbank-Constraint abgesichert.

Wenn `mail@gesundheitscoaches.de` schon einmal in der Empfängerliste war und
die erste Mail rausging, wird er beim zweiten Versand übersprungen. Die
Detail-Page zeigt das jetzt klar: „X versandfähig · Y noch nicht angeschrieben".

Falls die erste Mail tatsächlich nie ankam (Spam-Filter?), bitte im
Resend-Dashboard prüfen unter „Logs" — dort siehst du den Delivery-Status
jeder einzelnen Mail.

**2) Bearbeiten nach Versand** — sollte funktionieren wenn `campaign-resend.zip`
vom letzten Mal deployed ist. Auf der Detail-Page einer SENT-Kampagne sollte
oben rechts „✎ Bearbeiten" stehen. Falls nicht: Browser-Cache leeren (Strg+Shift+R)
oder im Render-Dashboard prüfen ob der letzte Build wirklich durchlief.

## Hochladen

1. ZIP entpacken
2. Alle 6 Dateien ins Repo (Pfade stimmen 1:1)
3. Commit: `komplett-update: bild-fix + footer-korrektur + impressum/agb/datenschutz/teilnahme`
4. Push → Render baut → fertig
