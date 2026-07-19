# Coachesprogramm

Projekt-Kontext für Claude Code. Diese Datei wird bei jedem Start automatisch geladen.

## Setup
- ECC (Profil `core`) ist projekt-lokal unter `.claude/` installiert: Agents, Commands, Skills, Rules, Hooks.
- ECC-Rules liegen unter `.claude/rules/` und gelten für dieses Projekt.
- Secrets gehören in `.env` (nicht committen — steht in `.gitignore`).

## Tech-Stack
- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Prisma 6** ORM → **PostgreSQL** (Supabase), Schema in `prisma/schema.prisma`
- **Tailwind CSS 3**
- **Auth:** JWT via `jose` + `bcryptjs`
- **E-Mail:** Resend; Editor: TipTap (WYSIWYG)
- **Push:** web-push
- Deployment: Render (`render.yaml`)
- Fachlich: Fitnessstudio-App mit E-Mail-**Funnels**, Anmelde-Flow und Admin-Panel (`src/app/admin`)

## Wichtige Befehle
- `npm run dev` — Dev-Server (http://localhost:3000)
- `npm run build` — Prisma generate + Next build
- `npm run db:push` — Schema in DB pushen
- `npm run db:studio` — Prisma Studio (DB-GUI)
- `npm run db:seed` — Seed-Daten
- `npm run admin:create` — Admin-User anlegen

## Konventionen
- `.env` enthält Secrets (DATABASE_URL, RESEND_API_KEY, TOKEN_SECRET, …) — nicht committen.
- ECC-Rules unter `.claude/rules/` gelten zusätzlich.
