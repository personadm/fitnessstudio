# Fitnessstudio App

Lead-Sammlung, Mitgliedsanmeldung und Mail-Marketing für ein Fitnessstudio.

**Stack**: Next.js 15 · Prisma · Postgres (Supabase) · Resend · TypeScript · Tailwind  
**Hosting**: Render · GitHub

---

## Deployment-Flow

```
[Mac (Code)] ──git push──▶ [GitHub Repo] ──auto-deploy──▶ [Render]
                                                              │
                                                              ▼
                                                        [Supabase DB]
                                                        [Resend Mail]
```

Du entwickelst lokal auf dem Mac. Jeder `git push` löst auf Render automatisch einen neuen Deploy aus.

---

## Setup

### 1. Supabase – Datenbank

1. Auf [supabase.com](https://supabase.com) registrieren (Login mit GitHub geht am schnellsten)
2. **New Project** → Name `fitnessstudio`, **Region Frankfurt**, Plan Free
3. Datenbank-Passwort gut merken
4. Warten bis das Projekt grün ist (~2 Min)
5. **Settings → Database → Connection string → URI** kopieren  
   `[YOUR-PASSWORD]` durch dein Passwort ersetzen

### 2. Resend – Mail-Versand

1. Auf [resend.com](https://resend.com) registrieren (mit der E-Mail-Adresse, an die du testen willst)
2. **API Keys → Create API Key** → "Sending access", All domains
3. Key kopieren (`re_...`)

### 3. GitHub – Source Control

1. Auf [github.com](https://github.com) Account anlegen, falls noch nicht vorhanden
2. **New Repository** → Name `fitnessstudio`, **Private**, kein README/gitignore (haben wir schon)
3. URL des Repos merken: `https://github.com/DEIN-USER/fitnessstudio.git`

### 4. Lokal: Code holen, installieren, testen

```bash
cd ~/Desktop/fitnessstudio          # in den entpackten Projektordner
npm install                          # Abhängigkeiten installieren
cp .env.example .env                 # .env-Datei erstellen
open -e .env                         # in TextEdit bearbeiten
```

In der `.env`:
- `DATABASE_URL` → Supabase-String aus Schritt 1
- `RESEND_API_KEY` → aus Schritt 2
- `MAIL_FROM` → `onboarding@resend.dev`
- Rest auf Default lassen

Schema in die DB pushen + Beispieldaten:

```bash
npm run db:push
npm run db:seed
```

Dev-Server testen:

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) → Landing Page muss erscheinen.  
Eintragen mit der Resend-Mail testen → DOI-Mail sollte ankommen.

### 5. Code zu GitHub pushen

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN-USER/fitnessstudio.git
git push -u origin main
```

### 6. Render – Deploy

1. Auf [render.com](https://render.com) registrieren (mit GitHub einloggen)
2. **New + → Web Service**
3. **Connect** den `fitnessstudio`-Repo (ggf. Render in deinen GitHub-Account autorisieren)
4. Render erkennt die `render.yaml` automatisch und schlägt die richtige Konfig vor
5. Vor dem ersten Deploy in **Environment** alle Werte aus deiner `.env` eintragen:
   - `DATABASE_URL`
   - `RESEND_API_KEY`
   - `MAIL_FROM`
   - `STUDIO_NAME`
   - `STUDIO_URL` → **Render-URL eintragen**, z.B. `https://fitnessstudio.onrender.com`
   - `TOKEN_SECRET`
6. **Create Web Service** klicken → Build läuft (~3-5 Min beim ersten Mal)

Wichtig: nach dem Deploy `STUDIO_URL` ggf. anpassen, damit die Links in den Mails (DOI-Bestätigung, "Hier anmelden") auf die echte Render-URL zeigen, nicht auf localhost.

---

## Tägliche Arbeitsweise

```bash
# Änderung lokal machen, testen mit npm run dev
git add .
git commit -m "neuer Tarif hinzugefügt"
git push
# → Render redeployed automatisch
```

---

## Datenmodell

| Modell           | Zweck                                                    |
| ---------------- | -------------------------------------------------------- |
| `Contact`        | Zentraler Datensatz – einmal pro E-Mail                  |
| `PricingPlan`    | Im Admin pflegbare Tarife, fließen in die Preis-Mail ein |
| `List`           | Empfängerlisten für Newsletter                           |
| `ContactList`    | n:m – wer ist auf welcher Liste?                         |
| `Campaign`       | Newsletter (Entwurf, geplant, versendet)                 |
| `CampaignEvent`  | Tracking pro Empfänger pro Kampagne                      |
| `ContactEvent`   | Audit-Log: was ist mit dem Kontakt passiert?             |
| `AdminUser`      | Login fürs Dashboard                                     |

`Contact.status`: `INTERESSENT | NEUKUNDE | KUNDE | EHEMALIGER` – die vier Tabs im Admin-Dashboard.

---

## Lead-Flow

```
1. Landing Page → E-Mail eingetragen
   POST /api/leads → Contact angelegt (INTERESSENT)
   DOI-Mail verschickt (ohne Werbung, nur Bestätigung)

2. DOI-Mail-Klick → /bestaetigen?token=xxx
   doiConfirmedAt gesetzt
   refToken vergeben
   Preis-Mail mit "Hier anmelden"-Button verschickt

3. "Hier anmelden"-Klick → /anmelden?ref=xxx (Etappe 2 - kommt noch)
   Vollständiges Formular
   Status: INTERESSENT → NEUKUNDE
```

---

## Was schon drin ist

- ✅ Komplettes Datenbankschema
- ✅ Landing Page (editorial Design, responsive)
- ✅ Lead-API mit DSGVO-konformem Double-Opt-In
- ✅ DOI-Bestätigungsseite + automatischer Versand der Preis-Mail
- ✅ Mail-Templates (DOI + Preis-Mail mit Tracking-Link)
- ✅ Render-Konfig (`render.yaml`) für automatischen Deploy

## Was als Nächstes kommt

- [ ] `/anmelden` mit vollständigem Formular und ref-Token-Verarbeitung
- [ ] Admin-Dashboard mit Login, Kontakt-Tabs, Tarif-Pflege, Kampagnen-Editor
- [ ] Newsletter-Versand-Engine
- [ ] Pflicht-Seiten Impressum / Datenschutz / AGB
