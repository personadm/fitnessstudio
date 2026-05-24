# Newsletter-Versand: gedrosselt & spam-sicher

Batched-Send für Newsletter mit:
- **Drosselung:** ~4 Mails/Sek (defensiv, freundlich gegenüber Spam-Filtern)
- **Idempotenz:** Doppel-Send unmöglich, auch bei Browser-Crash oder
  Re-Klicks (DB-Unique-Constraint)
- **Live-Progress:** „247 / 1777 versendet" mit Fortschrittsbalken
- **Resume:** Wenn Tab geschlossen wird, einfach erneut auf „Versenden"
  klicken — macht da weiter wo's aufgehört hat

## Was drin ist — 4 Files

| Datei | Status |
|---|---|
| `prisma/schema.prisma` | Update — Unique-Constraint auf CampaignEvent |
| `src/lib/campaigns.ts` | Update — kein DOI-Filter mehr |
| `src/app/admin/_actions.ts` | Update — neue `processCampaignBatch` Action |
| `src/app/admin/(authed)/campaigns/[id]/CampaignSendButton.tsx` | Ersetzen — Client mit Auto-Loop |

## Hochladen

1. ZIP entpacken
2. Alle 4 Files ins Repo (Pfade stimmen 1:1)
3. Commit: `Newsletter: batched send mit Drosselung und Resume`

Render baut → `prisma db push` legt den neuen Unique-Constraint an.

## Wie's funktioniert

### Beim Versand-Klick

1. Du klickst „Newsletter versenden"
2. Confirm-Dialog zeigt: „247 Empfänger · ca. 2 Minuten"
3. Du klickst „Ja, jetzt starten"
4. Loop startet im Browser: ruft die Server-Action `processCampaignBatch`
   wiederholt auf
5. Pro Aufruf: 30 Mails werden gedrosselt verschickt (~7 Sek pro Batch)
6. Fortschritt wird live aktualisiert
7. Wenn alle durch: Status auf SENT, „✓ Versendet" angezeigt

### Wenn was schiefgeht

- **Tab geschlossen / Browser abgestürzt:** Versand stoppt. Status bleibt
  auf SENDING. Du öffnest die Campaign-Seite wieder, klickst „Versenden",
  Loop macht da weiter wo's aufgehört hat. Schon verschickte Mails werden
  NICHT erneut versandt (das ist der Punkt des Unique-Constraints).
- **Render-Service neustartet:** Gleiche Story — schon-versendete Mails
  bleiben in der DB, neuer Versand-Versuch nimmt nur die fehlenden.
- **Resend hat einen Aussetzer:** Einzelne Mails könnten failen. Das Event
  ist dann aber schon eingetragen → kein Retry. Bewusste Entscheidung
  (lieber eine Mail nicht raus als doppelt). Du siehst's im Resend-Dashboard.

## Drosselungs-Parameter (im Code)

```ts
const CAMPAIGN_BATCH_SIZE = 30;       // Mails pro Server-Call
const CAMPAIGN_MAIL_THROTTLE_MS = 250; // ms zwischen Mails
```

Bei 250ms pro Mail = 4 Mails/Sek = 240 Mails/Min = ~14.000/Stunde.
Für deine 1777 Kontakte: ca. 7-8 Minuten total bei kontinuierlichem Versand.

Wenn du langsamer / vorsichtiger sein willst (z.B. erste Mail mit neuer
Domain), kannst du `CAMPAIGN_MAIL_THROTTLE_MS` auf 500 oder 1000
hochsetzen (entsprechend 2 oder 1 Mail/Sek).

## Spam-Vermeidung — was du sonst noch beachten solltest

Die Drosselung ist ein Teil. Plus:

1. **Resend-Domain-Reputation**: gesundheitscoaches.info ist relativ neu.
   Erste 100-200 Mails: lieber langsam (eine Mail alle 1-2 Sek). Resend
   Pro hat „Dedicated IP" Option falls du viel verschickst.
2. **Spam-Trigger im Text vermeiden**: keine ALL-CAPS Subjects, kein
   übertriebenes ! und $ im Subject, keine „GRATIS!!!"-Wörter
3. **Mehr Text als Bilder**: reine Bild-Mails landen oft im Spam
4. **List-Hygiene**: die 1777 Kontakte enthalten vermutlich tote Mail-Adressen
   (Tippfehler, alte Accounts). Wenn viele bouncen, leidet die Domain-
   Reputation. Pragmatisch: Resend zeigt bounces an — die Adressen
   regelmäßig aus deinen Listen entfernen.
5. **SPF/DKIM/DMARC**: Resend macht DKIM automatisch wenn Domain verified.
   SPF und DMARC noch in den DNS-Records bei deinem .info-Provider
   ergänzen (Resend zeigt dir was rein muss im Domains-Bereich).
6. **Abmeldelink im Footer**: hast du schon (✓), wichtig gegen Spam-Reports

## Notbremse

Falls du einen Versand mittendrin stoppen willst:
1. Tab schließen (stoppt Client-Loop)
2. Plus optional: Render-Service neu deployen (kills laufenden Server-Call)
3. Plus extrem: Resend-API-Key im Resend-Dashboard rotieren — danach
   schlagen alle weiteren Sends mit Auth-Fehler fehl. Härteste Notbremse.

Versand kann später durch erneuten Klick fortgesetzt werden — die bereits
verschickten Mails werden NICHT erneut versandt.
