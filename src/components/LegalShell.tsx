export function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4 text-[11px] uppercase tracking-[0.14em]">
          <a href="/" className="font-mono">{process.env.STUDIO_NAME ?? "Studio"}</a>
          <a href="/" className="font-mono text-muted hover:text-ink">← Zurück</a>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p className="label mb-4">Rechtliches</p>
        <h1 className="text-display text-5xl leading-[0.95] mb-12">{title}</h1>
        <div className="prose-legal text-base leading-relaxed text-ink-soft space-y-6">
          {children}
        </div>
      </article>

      <footer className="border-t border-ink/15">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-6 px-6 py-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <a href="/impressum" className="hover:text-ink">Impressum</a>
          <a href="/datenschutz" className="hover:text-ink">Datenschutz</a>
          <a href="/agb" className="hover:text-ink">AGB</a>
        </div>
      </footer>
    </main>
  );
}

export function LegalH2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-display text-2xl text-ink mt-12 mb-3">{children}</h2>;
}

export function LegalNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 border-l-4 border-acid bg-cream/50 p-4 text-sm text-ink-soft">
      {children}
    </div>
  );
}
