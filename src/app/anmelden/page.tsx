import { db } from "@/lib/db";
import { SignupForm } from "@/components/SignupForm";
import { MetaPixel } from "@/components/MetaPixel";
import { computeScarcity } from "@/lib/scarcity";

interface PageProps {
  searchParams: Promise<{ ref?: string }>;
}

const STUDIO = process.env.STUDIO_NAME ?? "Deine Gesundheitscoaches";
const PETROL = "#0F6E56";

const LOGO_URL =
  "https://static.wixstatic.com/media/fe97c9_89b309723d40451699a7888dfac8593a~mv2.png/v1/fill/w_180,h_180,al_c,q_85,enc_avif,quality_auto/Logo-FB-NEU.png";

export default async function AnmeldenPage({ searchParams }: PageProps) {
  const { ref } = await searchParams;

  const existingContact = ref
    ? await db.contact.findUnique({ where: { refToken: ref } })
    : null;

  // Verknappung berechnen (deterministisch pro Kunde, stabil bei Reload)
  const scarcity =
    ref && existingContact
      ? computeScarcity(ref, existingContact.doiConfirmedAt ?? existingContact.createdAt)
      : null;

  const [allPlans, locations] = await Promise.all([
    db.pricingPlan.findMany({
      where: { active: true, availableOnline: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.location.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, city: true },
    }),
  ]);

  if (allPlans.length === 0) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#FBF7F0] px-6">
        <div className="max-w-xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#8A857E]">
            × Konfiguration
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-[#2C2C2A] md:text-4xl">
            Aktuell sind keine Tarife verfügbar.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#5F5E5A]">
            Bitte versuch es später nochmal oder schreib uns eine Mail.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBF7F0]">
      {/* Meta-/Facebook-Pixel (Basis + PageView) */}
      <MetaPixel />
      {/* Header: Logo + Studio */}
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <a href="/" className="flex items-center gap-4">
            <img
              src={LOGO_URL}
              alt={STUDIO}
              width={44}
              height={44}
              className="h-11 w-11 flex-shrink-0"
              loading="eager"
            />
            <span
              className="text-lg font-semibold tracking-tight md:text-xl"
              style={{ color: PETROL }}
            >
              {STUDIO}
            </span>
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-10 md:py-16 md:px-6">
        {/* Fortschrittsanzeige */}
        <ProgressBar />

        {/* H1 + Subtitle */}
        <h1 className="mt-6 text-3xl font-bold leading-tight text-[#2C2C2A] md:text-4xl lg:text-5xl">
          Jetzt starten — deine Krankenkasse zahlt.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#5F5E5A] md:text-lg">
          Dein 6-Wochen-Programm. Danach entscheidest du frei, ob du weitermachst.
        </p>

        {/* Tarif-Auswahl + Karte */}
        <div className="mt-8">
          <SignupForm
            plans={allPlans.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              priceCents: p.priceCents,
              billingInterval: p.billingInterval,
              highlights: p.highlights,
              topHighlights: parseTopHighlights(p.topHighlights),
              agb: p.agb,
              locationId: p.locationId,
            }))}
            locations={locations}
            ref_={ref ?? null}
            prefilledEmail={existingContact?.email ?? ""}
            prefilledFirstName={existingContact?.firstName ?? undefined}
            prefilledLastName={existingContact?.lastName ?? undefined}
            prefilledGender={existingContact?.gender ?? null}
            prefilledLocationId={existingContact?.locationId ?? null}
            scarcityPlaces={scarcity?.placesLeft ?? null}
            scarcityDeadlineIso={scarcity?.deadlineIso ?? null}
          />
        </div>
      </section>

      <footer className="border-t border-[#E8E2D5] bg-[#FBF7F0]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-[#8A857E]">
          <span>
            © {new Date().getFullYear()} {STUDIO}
          </span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="/impressum" className="hover:text-[#2C2C2A]">
              Impressum
            </a>
            <a href="/datenschutz" className="hover:text-[#2C2C2A]">
              Datenschutz
            </a>
            <a href="/agb" className="hover:text-[#2C2C2A]">
              AGB
            </a>
            <a href="/teilnahmebedingungen" className="hover:text-[#2C2C2A]">
              Teilnahmebedingungen
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}

/**
 * Fortschrittsanzeige: ① Angebot → ② Bestätigt → ③ Anmelden (③ aktiv)
 */
function ProgressBar() {
  const steps = [
    { num: "①", label: "Angebot", active: false, done: true },
    { num: "②", label: "Bestätigt", active: false, done: true },
    { num: "③", label: "Anmelden", active: true, done: false },
  ];

  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs font-medium md:gap-3 md:text-sm">
      {steps.map((s, idx) => (
        <li key={s.label} className="flex items-center gap-2 md:gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 md:gap-2 md:px-3"
            style={{
              backgroundColor: s.active
                ? PETROL
                : s.done
                  ? "rgba(15,110,86,0.1)"
                  : "transparent",
              color: s.active ? "#FFFFFF" : s.done ? PETROL : "#8A857E",
            }}
          >
            <span>{s.num}</span>
            <span>{s.label}</span>
          </span>
          {idx < steps.length - 1 && <span className="text-[#A8A39A]">→</span>}
        </li>
      ))}
    </ol>
  );
}

/**
 * Sicheres Parsen des topHighlights-Json-Feldes.
 * Im Schema ist das `Json @default("[]")` — kann aber als string oder
 * als bereits geparste Array kommen, je nach Prisma-Version.
 */
type TopHighlight = { text: string; subtitle?: string; isGold?: boolean };

function parseTopHighlights(raw: unknown): TopHighlight[] {
  if (!raw) return [];
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(
      (x): x is Record<string, unknown> =>
        typeof x === "object" && x !== null && typeof (x as { text?: unknown }).text === "string",
    )
    .slice(0, 3)
    .map((x) => ({
      text: String(x.text),
      subtitle: typeof x.subtitle === "string" ? x.subtitle : "",
      isGold: x.isGold === true,
    }));
}
