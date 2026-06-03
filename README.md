# Tranche A — Vertrag-Workflow

2 Dateien + ein 5-Zeilen-Snippet das du selbst einfügst.

## Was drin ist

| Datei | Status | Was |
|---|---|---|
| `src/lib/mail.ts` | Update | „Vertrag" raus aus der Anmeldebestätigungs-Mail. Statt „mit dem Vertrag und allen weiteren Schritten" jetzt „mit allen weiteren Schritten zu deinem Start". Und „AGB & Vertragsbedingungen anzeigen" → „AGB anzeigen". |
| `src/app/admin/(authed)/contacts/[id]/vertrag/page.tsx` | **NEU** | Druckbare Vertragsseite pro Kunde, DIN A4 print-CSS. Inhalt: Briefkopf (Vital-Fit oder Villa-Fit je nach `locationId`), Vertragsnummer, Kundendaten, Tarif & Konditionen, IBAN-Feld (vorausgefüllt falls vorhanden, sonst leere Linie zum Eintragen), SEPA-Mandatstext, Hinweise, zwei Unterschriftsfelder. **Plus AGB als Anhang auf Seite 2 (page-break-before)**. |

## Button auf deiner Contact-Detail-Page einbauen

Ich hab deine `src/app/admin/(authed)/contacts/[id]/page.tsx` nicht im
Output-Archiv. **Diese drei Zeilen** musst du selbst da reinkopieren — am
besten oben in den Action-Button-Bereich:

```tsx
import Link from "next/link";

// … irgendwo zwischen den anderen Buttons …
<Link
  href={`/admin/contacts/${contact.id}/vertrag`}
  className="rounded-md bg-[#0F6E56] px-4 py-2 text-sm font-semibold text-white"
>
  🖨 Vertrag drucken
</Link>
```

Falls du die Stelle nicht findest: schick mir die Datei
(`src/app/admin/(authed)/contacts/[id]/page.tsx`) hoch, ich liefere
dir die fertige Version.

## Was die Vertragsseite kann

- **Aufruf**: `/admin/contacts/<contact-id>/vertrag`
- **Briefkopf** wird aus `contact.location` (Vital-Fit oder Villa-Fit) gezogen
- **USt-IdNr / HRB** für Vital-Fit sind hinterlegt (DE 313 650 908 / Steinfurt HRB 11713). Für Villa-Fit hab ich „—" gesetzt, weil ich die Daten nicht habe — schick mir die, dann ergänze ich
- **IBAN**: wenn beim Online-Signup keine eingegeben wurde, erscheint eine leere Linie zum Eintragen mit der Hand. Wenn doch (z.B. bei Club-Anmeldung), wird sie vorausgefüllt
- **Kontoinhaber/Kreditinstitut/BIC**: leere Linien, vom Kunden auszufüllen
- **AGB**: kompletter Volltext als zweite Druckseite (automatischer Seitenumbruch)
- **Druck-Button** oben rechts. Beim Drucken werden alle Admin-UI-Elemente ausgeblendet (`@media print`)

## Hochladen

1. ZIP entpacken (achte auf den Wrapper-Ordner!)
2. Die zwei Files an die exakten Pfade kopieren:
   - `src/lib/mail.ts`
   - `src/app/admin/(authed)/contacts/[id]/vertrag/page.tsx`
3. Drei Button-Zeilen in deine `contacts/[id]/page.tsx` einfügen
4. Commit: `vertrag: druckbare vertragsseite + agb-anhang + iban-feld`

## Test nach Deploy

1. Im Admin einen Kontakt mit Status `NEUKUNDE` öffnen
2. „Vertrag drucken" klicken → kommt zur neuen Seite
3. Browser-Druck (Strg+P / Cmd+P) → Vorschau prüfen:
   - Briefkopf richtig (Vital-Fit oder Villa-Fit je nach Studio)
   - Vertragsnummer = letzte 8 Stellen der Contact-ID
   - Kundendaten, Tarif, Preis korrekt
   - IBAN-Feld leer (wenn nicht eingegeben) oder ausgefüllt
   - Seite 2 = AGB-Volltext
4. Wenn alles passt → echt drucken oder als PDF speichern

Wenn was nicht stimmt (Felder fehlen, Layout zerschossen, Briefkopf falsch),
schick mir Screenshot der Druckvorschau, ich fixe gezielt.

---

## Was als nächstes kommt (Tranche B)

Ich liefere danach getrennt:
- Funnel-Step-Sortierung visuell nach Gesamtdauer (3h → 1d → 3d → 5d)
- Funnel-Edit-Bug-Fix (TipTap re-load mit Bildern)
- „Aus Pages Datei" entfernen + KI-Funktion mit Hormozi-Frameworks erweitern

Sag bescheid wenn Tranche A durchgelaufen ist und funktioniert.
