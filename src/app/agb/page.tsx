import Link from "next/link";
import { AGB_SECTIONS, AGB_STAND } from "@/lib/legal";

const STUDIO = process.env.STUDIO_NAME ?? "Deine Gesundheitscoaches";

export const metadata = {
  title: "AGB",
  description:
    "Allgemeine Geschäftsbedingungen für die Gesundheits- und Coaching-Dienstleistungen von Vital-Fit Ochtrup und Villa-Fit Ahaus.",
};

export default function AGBPage() {
  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 text-[11px] uppercase tracking-[0.14em]">
          <Link href="/" className="font-mono hover:text-ink-soft">
            ← Zurück
          </Link>
          <span className="font-mono">{STUDIO}</span>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <p className="label mb-6">Rechtliches</p>
        <h1 className="text-display-italic text-5xl md:text-7xl leading-[0.95] mb-12">
          AGB
        </h1>

        <p className="text-base mb-8">
          Allgemeine Geschäftsbedingungen (Dienstleistung)
        </p>

        {AGB_SECTIONS.map((section) => (
          <Section key={section.heading} title={section.heading}>
            <p>{section.body}</p>
          </Section>
        ))}

        <Section title="Anbieter">
          <div className="space-y-2 font-mono text-xs text-ink-soft">
            <p>Vital-Fit GmbH · Laurenzstr. 98 · 48607 Ochtrup</p>
            <p>Villa-Fit GmbH · Erhardstr. 2 · 48683 Ahaus</p>
            <p>E-Mail: mail@gesundheitscoaches.de</p>
            <p>Stand: {AGB_STAND}</p>
          </div>
        </Section>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft mb-3">
        {title}
      </h2>
      <div className="prose prose-sm max-w-none text-ink leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
