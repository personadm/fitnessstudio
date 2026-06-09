/**
 * Multi-Tenant — Mandanten-Auflösung.
 *
 * Jedes Studio ist über seine Subdomain erreichbar: <slug>.<root-domain>.
 * Dieses Modul übersetzt einen HTTP-Host in einen Studio-Slug und lädt
 * den passenden Mandanten aus der DB.
 *
 * Verwendung (Phase 2): Middleware/Server-Komponenten lesen den Host,
 * lösen das Studio auf und schränken alle Queries auf `studio.id` ein.
 */
import { redirect } from "next/navigation";
import { db } from "./db";
import { getSession } from "./auth";

/**
 * Root-Domain der Plattform, OHNE Subdomain. Beispiel: "meinapp.de".
 * In Entwicklung: "localhost:3000" (oder via APP_ROOT_DOMAIN überschreiben).
 */
export const ROOT_DOMAIN = process.env.APP_ROOT_DOMAIN?.trim() || "localhost:3000";

/**
 * Reservierte Subdomains, die KEIN Studio sind (Plattform-Ebene/Infra).
 * "platform" → dein Betreiber-Backend, "www"/"app" → Marketing/Default.
 */
const RESERVED_SUBDOMAINS = new Set(["platform", "www", "app", "admin", "api"]);

/**
 * Extrahiert den Studio-Slug aus einem Host.
 *
 * Reine Funktion (keine DB) — leicht testbar.
 *
 * Beispiele (ROOT_DOMAIN = "meinapp.de"):
 *   "fitlife.meinapp.de"      → "fitlife"
 *   "meinapp.de"              → null   (Root, kein Studio)
 *   "www.meinapp.de"          → null   (reserviert)
 *   "platform.meinapp.de"     → null   (reserviert)
 *   "fitlife.localhost:3000"  → "fitlife"  (Dev)
 *
 * @param host  Der Host-Header (z. B. aus `req.headers.host`).
 * @param rootDomain  Root-Domain ohne Subdomain. Default: ROOT_DOMAIN.
 * @returns Slug oder null, wenn kein Studio adressiert wird.
 */
export function slugFromHost(host: string | null | undefined, rootDomain: string = ROOT_DOMAIN): string | null {
  if (!host) return null;

  // Port und Groß-/Kleinschreibung normalisieren.
  const normalizedHost = host.toLowerCase().split(":")[0];
  const normalizedRoot = rootDomain.toLowerCase().split(":")[0];

  // Host muss auf ".<root>" enden, um eine Subdomain zu sein.
  const suffix = `.${normalizedRoot}`;
  if (!normalizedHost.endsWith(suffix)) {
    // Exakt die Root-Domain (kein Studio) oder eine fremde Domain.
    return null;
  }

  const sub = normalizedHost.slice(0, -suffix.length);
  if (!sub || sub.includes(".")) {
    // Leer oder mehrstufig (z. B. "a.b.root") → kein einfaches Studio.
    return null;
  }

  if (RESERVED_SUBDOMAINS.has(sub)) return null;

  return sub;
}

/** Erlaubtes Slug-Format: 2–40 Zeichen, a-z/0-9/Bindestrich, nicht am Rand. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

/** Erzeugt einen Subdomain-tauglichen Slug aus einem freien Text. */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug;
}

/** True, wenn der Slug für die Plattform reserviert ist (kein Studio). */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SUBDOMAINS.has(slug);
}

/** True, wenn der Host das Plattform-Backend adressiert (platform.<root>). */
export function isPlatformHost(host: string | null | undefined, rootDomain: string = ROOT_DOMAIN): boolean {
  if (!host) return false;
  const normalizedHost = host.toLowerCase().split(":")[0];
  const normalizedRoot = rootDomain.toLowerCase().split(":")[0];
  return normalizedHost === `platform.${normalizedRoot}`;
}

export type ResolvedStudio = {
  id: string;
  slug: string;
  name: string;
  status: "ONBOARDING" | "ACTIVE" | "SUSPENDED";
};

/**
 * Lädt das aktive Studio zu einem Slug. Gibt null zurück, wenn es kein
 * Studio mit diesem Slug gibt.
 *
 * Hinweis: Liefert das Studio in JEDEM Status zurück (auch SUSPENDED/
 * ONBOARDING) — die aufrufende Schicht entscheidet, was damit passiert
 * (z. B. SUSPENDED → Sperrseite, ONBOARDING → Wizard).
 */
export async function getStudioBySlug(slug: string): Promise<ResolvedStudio | null> {
  const studio = await db.studio.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, status: true },
  });
  return studio;
}

/** Lädt ein Studio über eine eigene (Custom-)Domain. Für spätere Phase. */
export async function getStudioByCustomDomain(host: string): Promise<ResolvedStudio | null> {
  const normalizedHost = host.toLowerCase().split(":")[0];
  const studio = await db.studio.findUnique({
    where: { customDomain: normalizedHost },
    select: { id: true, slug: true, name: true, status: true },
  });
  return studio;
}

/**
 * Bequemer Where-Filter-Baustein für mandanten-sichere Queries.
 * Beispiel:  db.contact.findMany({ where: { ...studioScope(studioId), status } })
 */
export function studioScope(studioId: string): { studioId: string } {
  return { studioId };
}

// ─────────────────────────────────────────────────────────────
// Aktuelle-Studio-Auflösung
//
// Übergangslösung Single→Multi-Tenant: Solange noch kein Subdomain-Routing
// scharf ist, läuft die bestehende Seite auf der nackten Domain weiter und
// fällt auf das (einzige) Studio zurück. Sobald Subdomains live sind, liefert
// resolveStudioIdFromHost() pro Subdomain das richtige Studio.
// ─────────────────────────────────────────────────────────────

// Default-Studio-ID wird einmal pro Prozess gecacht (stabiler Wert).
let cachedDefaultStudioId: string | null = null;

/**
 * Liefert die ID des Default-Studios (ältestes Studio). Fallback, wenn aus
 * dem Host kein konkretes Studio bestimmt werden kann (nackte Domain, Dev,
 * CLI-Skripte). Wirft, wenn gar kein Studio existiert.
 */
export async function getDefaultStudioId(): Promise<string> {
  if (cachedDefaultStudioId) return cachedDefaultStudioId;
  const studio = await db.studio.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!studio) {
    throw new Error("Kein Studio vorhanden — Backfill/Onboarding erforderlich.");
  }
  cachedDefaultStudioId = studio.id;
  return studio.id;
}

/**
 * Bestimmt die Studio-ID aus einem HTTP-Host (Subdomain). Fällt auf das
 * Default-Studio zurück, wenn keine passende Subdomain gefunden wird.
 * Für öffentliche Routen (Leads, Signup, Login).
 */
export async function resolveStudioIdFromHost(host: string | null | undefined): Promise<string> {
  const slug = slugFromHost(host);
  if (slug) {
    const studio = await getStudioBySlug(slug);
    if (studio) return studio.id;
  }
  return getDefaultStudioId();
}

/**
 * Studio-ID des eingeloggten Admins (Server-Kontext). Bevorzugt aus der
 * Session; fällt für Alt-Sessions auf einen Lookup über den AdminUser zurück.
 * Gibt null zurück, wenn nicht eingeloggt.
 */
export async function getCurrentStudioId(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.studioId) return session.studioId;
  const admin = await db.adminUser.findUnique({
    where: { id: session.userId },
    select: { studioId: true },
  });
  return admin?.studioId ?? null;
}

/**
 * Wie getCurrentStudioId(), aber leitet bei fehlendem Studio-Kontext direkt
 * zum Admin-Login um. Für Server-Komponenten (Admin-Seiten) gedacht — gibt
 * garantiert eine studioId zurück, sodass jede Folge-Query sicher gescoped ist.
 */
export async function requireStudioId(): Promise<string> {
  const id = await getCurrentStudioId();
  if (!id) redirect("/admin/login");
  return id;
}
