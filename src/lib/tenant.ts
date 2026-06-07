import { db } from "./db";

/**
 * Default-Tenant-ID für deine bestehenden Daten ("Deine Gesundheitscoaches").
 * Wird via Migrations-SQL als fester String angelegt.
 *
 * In Code: `import { DEFAULT_TENANT_ID } from "@/lib/tenant"`
 */
export const DEFAULT_TENANT_ID = "tenant_dgc_default";

/**
 * Schlankes Tenant-Objekt für Session/Auth-Zwecke.
 */
export interface SessionTenant {
  id: string;
  slug: string;
  name: string;
  status: "ACTIVE" | "TRIAL" | "SUSPENDED" | "CANCELLED";
}

/**
 * Lädt einen Tenant per ID. Returnt null wenn nicht gefunden.
 */
export async function getTenantById(id: string): Promise<SessionTenant | null> {
  const t = await db.tenant.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true, status: true },
  });
  return t as SessionTenant | null;
}

/**
 * Lädt einen Tenant per slug — wird für Endkunden-URLs gebraucht
 * (`gesundheitscoaches.app/<slug>/anmelden`).
 */
export async function getTenantBySlug(slug: string): Promise<SessionTenant | null> {
  const t = await db.tenant.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, status: true },
  });
  return t as SessionTenant | null;
}

/**
 * Prüft ob der Tenant operativ ist (also nicht SUSPENDED oder CANCELLED).
 * Wird in der Middleware verwendet um Zugriff zu blockieren.
 */
export function isTenantOperational(status: SessionTenant["status"]): boolean {
  return status === "ACTIVE" || status === "TRIAL";
}

/**
 * Slug-Validierung für das Onboarding — verhindert komische URLs.
 * Erlaubt: a-z, 0-9, Bindestriche. Min 3, max 40 Zeichen. Nicht mit
 * Bindestrich starten/enden.
 */
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

/**
 * Reservierte Slugs die NICHT von Tenants belegt werden dürfen.
 * Alles was als Route-Segment kollidieren würde.
 */
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "login",
  "logout",
  "signup",
  "register",
  "onboarding",
  "super-admin",
  "superadmin",
  "anmelden",
  "abmelden",
  "agb",
  "datenschutz",
  "impressum",
  "kontakt",
  "support",
  "help",
  "docs",
  "blog",
  "settings",
  "account",
  "billing",
  "tenants",
  "tenant",
  "_next",
  "public",
  "static",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export function isValidSlug(slug: string): boolean {
  if (!slug) return false;
  if (RESERVED_SLUGS.has(slug.toLowerCase())) return false;
  return SLUG_REGEX.test(slug);
}

/**
 * Gibt einen Vorschlag für einen freien Slug zurück, abgeleitet aus dem
 * Studio-Namen. Wird im Onboarding-Form als Default-Wert angezeigt.
 *
 * Beispiele:
 *   "Fitness Müller GmbH" → "fitness-mueller"
 *   "VITAL-FIT 24" → "vital-fit-24"
 *   "Studio @ Ahaus" → "studio-ahaus"
 *
 * NICHT garantiert verfügbar — der finale Check passiert im Onboarding.
 */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 40);
}
