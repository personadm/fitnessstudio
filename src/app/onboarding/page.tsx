import { submitCode } from "./_actions";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export const metadata = { title: "Studio einrichten" };

export default async function OnboardingPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6">
      <div className="w-full max-w-md">
        <p className="label mb-4">Willkommen</p>
        <h1 className="text-display text-4xl leading-[1.05] mb-3">
          Richte dein Studio ein
        </h1>
        <p className="mb-10 text-sm leading-relaxed text-ink/70">
          Gib den Aktivierungs-Code ein, den du beim Kauf erhalten hast. Danach
          klären wir in wenigen Schritten alles Wichtige — am Ende steht deine
          Landingpage samt eigenem Backend.
        </p>

        <form action={submitCode} className="space-y-6">
          <label className="block">
            <span className="label mb-2 block">Aktivierungs-Code</span>
            <input
              type="text"
              name="code"
              required
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="STUDIO-XXXX-XXXX"
              className="w-full border-b-2 border-ink bg-transparent py-2 font-mono text-lg uppercase tracking-[0.1em] outline-none focus:border-acid_dark"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              Dieser Code ist ungültig, abgelaufen oder bereits eingelöst.
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-ink py-3 text-acid hover:bg-ink-soft"
          >
            <span className="font-mono text-sm uppercase tracking-[0.14em]">
              Weiter →
            </span>
          </button>
        </form>
      </div>
    </main>
  );
}
