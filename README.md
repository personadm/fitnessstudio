# Fitnessstudio App

Schlanke Web-App für ein Fitnessstudio:

1. **Landing Page** mit Mail-Eintragung (DSGVO-konformes Double-Opt-In)
2. Automatische **Preis-Mail** mit Tracking-Link nach Bestätigung
3. **Mitgliedsanmeldung** unter `/anmelden` mit vollem Formular und Tarif-Auswahl
4. **Admin-Dashboard** unter `/admin` mit Auth, Kontakten, Tarifen, Listen, Newsletter
5. **Pflicht-Seiten** (Impressum, Datenschutz, AGB) als Templates

Stack: Next.js 15 (App Router) · React 19 · TypeScript · Prisma · PostgreSQL (Supabase) · Tailwind · Resend

---

## Entwicklung lokal starten

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. `.env` anlegen

Lege eine Datei `.env` im Projekt-Root an (siehe `.env.example`):

```
DATABASE_URL="postgresql://..."
RESEND_API_KEY="re_..."
MAIL_FROM="onboarding@resend.dev"
TOKEN_SECRET="zufaelligen-langen-string-hier-eintragen"
STUDIO_NAME="Studio Iron"
STUDIO_URL="http://localhost:3000"
```

> `TOKEN_SECRET` wird sowohl für DOI-Tokens als auch für die Admin-Session-JWTs verwendet. Mind. 32 zufällige Zeichen.

### 3. Datenbank synchronisieren und seeden

```bash
npm run db:push     # Schema in DB pushen
npm run db:seed     # Demo-Tarife anlegen
```

### 4. Ersten Admin anlegen

```bash
npm run admin:create
```

Das Skript fragt interaktiv nach E-Mail und Passwort (mind. 12 Zeichen).

### 5. Dev-Server starten

```bash
npm run dev
```

App läuft auf [http://localhost:3000](http://localhost:3000).

Admin-Login: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

---

## Routenübersicht

### Öffentlich

| Pfad | Was |
|---|---|
| `/` | Landing mit Mail-Eintragung |
| `/bestaetigen?token=…` | DOI-Bestätigung, löst Preis-Mail aus |
| `/anmelden?ref=…` | Vollständiges Mitgliedsantragsformular |
| `/anmelden/danke` | Erfolgsseite |
| `/impressum` | Pflichtangaben (Template) |
| `/datenschutz` | DSGVO-Erklärung (Template) |
| `/agb` | Allgemeine Geschäftsbedingungen (Template) |

### Admin (Login erforderlich)

| Pfad | Was |
|---|---|
| `/admin/login` | Anmeldung |
| `/admin` | Übersicht mit Status-Stats |
| `/admin/contacts` | Liste aller Kontakte mit Status-Tabs und Suche |
| `/admin/contacts/[id]` | Detail: Status ändern, Listen, Notizen, Aktivitäts-Log |
| `/admin/plans` | Tarife pflegen (CRUD) |
| `/admin/lists` | Newsletter-Listen verwalten |
| `/admin/campaigns` | Übersicht aller Kampagnen |
| `/admin/campaigns/new` | Neue Kampagne anlegen |
| `/admin/campaigns/[id]` | Kampagne ansehen + versenden |

### API

| Endpunkt | Methode | Was |
|---|---|---|
| `/api/leads` | POST | Mail-Eintrag (DOI-Mail wird ausgelöst) |
| `/api/leads/confirm` | GET | DOI-Token bestätigen |
| `/api/signup` | POST | Mitgliedsantrag |
| `/api/auth/login` | POST | Admin-Login |
| `/api/auth/logout` | POST | Admin-Logout |
| `/api/admin/campaigns/[id]/send` | POST | Kampagne versenden |

---

## Deployment auf Render

`render.yaml` ist im Repo. Wichtig: in den Render-Env-Vars müssen alle Werte aus `.env` gesetzt sein, insbesondere:

- `DATABASE_URL` (Supabase Pooler-URL, **nicht** Direct Connection — Render hat kein IPv6)
- `RESEND_API_KEY`
- `MAIL_FROM` (verifizierte Adresse oder `onboarding@resend.dev` für Tests)
- `TOKEN_SECRET`
- `STUDIO_NAME`, `STUDIO_URL` (Production-URL!)

Build-Command: `npm install && npm run build`
Start-Command: `npm start`

Erster Admin auf Render: einmal lokal mit der Production-`DATABASE_URL` `npm run admin:create` ausführen.

---

## Sicherheits-Checkliste vor Live-Gang

- [ ] `TOKEN_SECRET` durch echten zufälligen String ersetzt (Production)
- [ ] Resend-API-Key und DB-Passwort rotiert (falls in Screenshots o.ä. exponiert)
- [ ] `MAIL_FROM` ist eigene verifizierte Domain
- [ ] Admin-Passwort hat ≥ 16 Zeichen
- [ ] Impressum, Datenschutz, AGB durch echte Daten ersetzt (Anwalt drüberschauen lassen)
- [ ] In `STUDIO_URL` die Production-URL eingetragen
- [ ] Resend-Free-Tier-Limit (100 Mails/Tag) im Auge behalten oder auf bezahlten Plan upgraden

---

## Verzeichnisstruktur (kurz)

```
src/
  app/
    page.tsx                      Landing
    bestaetigen/                  DOI-Bestätigung
    anmelden/                     Mitgliedsantrag
    impressum/, datenschutz/, agb/ Pflichtseiten
    admin/
      login/                      Login (öffentlich)
      (authed)/                   Geschützter Admin-Bereich
        layout.tsx                Auth-Check + Sidebar
        page.tsx                  Übersicht
        contacts/, plans/, lists/, campaigns/
      _actions.ts                 Server-Actions (alle Admin-Mutationen)
    api/                          API-Routen (lead, signup, auth, send)
  components/                     UI-Bausteine (LeadForm, SignupForm, Sidebar, ...)
  lib/
    auth.ts                       Session/JWT-Helper
    db.ts                         Prisma Client
    mail.ts                       Resend-Templates (DOI, Preis, Confirm, Newsletter)
    tokens.ts                     DOI-/ref-Token-Erzeugung
    validation.ts                 Zod-Schemas
  middleware.ts                   Auth-Wache für /admin/*
prisma/
  schema.prisma                   Datenmodell
  seed.ts                         Demo-Daten
  create-admin.ts                 CLI für ersten Admin
```

---

## Was noch fehlt / bewusst weggelassen

- Open- / Click-Tracking in Newslettern (Pixel + Link-Wrapping) — kann später ergänzt werden
- Rich-Text-Editor für Kampagnen — aktuell HTML-Textarea (einfach, ehrlich)
- Mehrbenutzer-Rollen im Admin
- Bezahl-Integration (Stripe / SEPA)
- Soft-Delete für Kontakte (aktuell hartes Löschen mit Cascade)
- Rate-Limit auf öffentlichen Endpunkten (sollte vor Production rein)

---

## Funnels (automatische Mail-Sequenzen)

Im Admin unter `/admin/funnels` lassen sich Mail-Funnels anlegen, die automatisch
ausgelöst werden, sobald ein Kontakt einen bestimmten Status bekommt.

**Auslöser**: Status-Wechsel zu `INTERESSENT`, `NEUKUNDE`, `KUNDE` oder `EHEMALIGER`.

**Schritte**: pro Schritt definierst du eine Wartezeit in Tagen (gerechnet ab
Eintragung in den Funnel) sowie Betreff und HTML-Inhalt der Mail. Im Inhalt
kannst du `{{firstName}}` und `{{lastName}}` als Platzhalter nutzen.

**Beispiel: Win-Back für Ehemalige**
- Auslöser: „Wird Ehemaliger"
- Schritt 1, nach 14 Tagen: „Schade, dass du gegangen bist – ein paar Worte"
- Schritt 2, nach 30 Tagen: „Wir haben dir was vorbereitet – komm zurück"
- Schritt 3, nach 60 Tagen: „Letzte Erinnerung: 1 Monat geschenkt"

Wenn der Kontakt vor Ende des Funnels wieder Kunde wird, stoppt die Sequenz
automatisch (Option „Automatisch stoppen, wenn Kontakt den Trigger-Status wieder
verlässt").

### Verarbeitung — wer schickt die Mails?

Es gibt zwei Wege, fällige Schritte zu versenden:

**(a) Manuell, im Admin**
Auf `/admin/funnels` ist ein Button „Jetzt verarbeiten". Praktisch zum Testen
und als Fallback.

**(b) Automatisch, via cron-job.org (empfohlen)**
1. Auf [cron-job.org](https://cron-job.org) kostenlosen Account anlegen
2. Neuen Cronjob erstellen mit:
   - **URL**: `https://DEINE-DOMAIN.onrender.com/api/cron/process-funnels?key=DEIN_CRON_SECRET`
   - **Schedule**: stündlich (z.B. jede volle Stunde)
   - **Method**: GET
3. Speichern, fertig. Die Mails werden ab sofort automatisch in den vom Inhaber
   gesetzten Wartezeiten versendet.

Den Wert für `DEIN_CRON_SECRET` musst du als `CRON_SECRET` Env-Var auf Render
setzen (gleicher Wert wie in der URL bei cron-job.org). Erzeugen mit
`openssl rand -hex 24`.

---

## Phase 6 (aktuelle Erweiterung)

Was sich gegenüber Phase 5 geändert hat:

- **Landing-Page**: keine Tarife mehr direkt sichtbar; stattdessen Felder für
  Vorname, Nachname, Geschlecht. Tarife erscheinen erst auf der neuen Seite
  `/preise` nach Mail-Eintragung.
- **Mitgliedsanmeldung**: zusätzliche Felder für IBAN und Vertragsstart.
- **Dashboard**: neue Sektion „Neukunden diesen Monat" — listet alle, die im
  laufenden Kalendermonat zu Neukunden geworden sind, Reset zum 1.
- **Funnels**: neues Modul (siehe Abschnitt oben).

### Schema-Migration

Beim Update sind neue Felder und Tabellen dazugekommen. Einmal ausführen:

```
npm run db:push
```

Es werden ergänzt:
- `Contact`: `gender`, `iban`, `contractStartDate`, `signupAt`
- Neue Enums: `Gender`, `FunnelTrigger`
- Neue Tabellen: `Funnel`, `FunnelStep`, `FunnelEnrollment`, `FunnelStepEvent`

Die Migration ist additiv – keine bestehenden Daten gehen verloren.
