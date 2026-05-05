const STUDIO = process.env.STUDIO_NAME ?? "Studio Iron";

export default function DankePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-xl">
        <p className="label mb-6">✓ Anmeldung eingegangen</p>
        <h1 className="text-display text-5xl leading-[0.95] md:text-7xl">
          Willkommen.
        </h1>
        <p className="mt-6 text-base leading-relaxed text-ink-soft">
          Wir haben deine Anmeldung erhalten. In den nächsten Werktagen melden wir uns mit dem Vertrag und allen weiteren
          Schritten. Eine Bestätigungs-Mail mit den Eckdaten ist gerade unterwegs in dein Postfach.
        </p>
        <p className="mt-8 text-sm text-muted">— {STUDIO}</p>
        <a
          href="/"
          className="mt-10 inline-block border-b-2 border-ink pb-1 font-mono text-sm uppercase tracking-[0.14em] hover:text-ink-soft"
        >
          Zur Startseite ↑
        </a>
      </div>
    </main>
  );
}
