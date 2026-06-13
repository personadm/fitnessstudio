import { db } from "@/lib/db";
import { KNOWLEDGE_BASE_ID, SOURCE_CHANNELS } from "@/lib/knowledge/config";
import { KnowledgeSyncButtons } from "@/components/admin/KnowledgeSyncButtons";
import type { KnowledgeVideoStatus } from "@prisma/client";

const STATUS_LABELS: Record<KnowledgeVideoStatus, string> = {
  NEW: "Neu (wartet auf Transkript)",
  TRANSCRIBED: "Transkribiert",
  RELEVANT: "Relevant (wartet auf Destillierung)",
  DISTILLED: "In Wissensbasis",
  IRRELEVANT: "Aussortiert",
  NO_TRANSCRIPT: "Kein Transkript",
  ERROR: "Fehler",
};

const STATUS_ORDER: KnowledgeVideoStatus[] = [
  "DISTILLED",
  "RELEVANT",
  "TRANSCRIBED",
  "NEW",
  "NO_TRANSCRIPT",
  "IRRELEVANT",
  "ERROR",
];

function formatDate(d: Date | null): string {
  if (!d) return "noch nie";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function KnowledgePage() {
  const [kb, grouped, recent, total] = await Promise.all([
    db.knowledgeBase.findUnique({ where: { id: KNOWLEDGE_BASE_ID } }),
    db.knowledgeVideo.groupBy({ by: ["status"], _count: { _all: true } }),
    db.knowledgeVideo.findMany({
      orderBy: [{ discoveredAt: "desc" }],
      take: 20,
      select: { id: true, title: true, status: true, url: true, publishedAt: true },
    }),
    db.knowledgeVideo.count(),
  ]);

  const counts = new Map<KnowledgeVideoStatus, number>();
  for (const g of grouped) counts.set(g.status, g._count._all);

  return (
    <div className="p-8 md:p-12">
      <div className="mb-12">
        <p className="label">KI</p>
        <h1 className="mt-2 text-display text-5xl">Wissensbasis</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted leading-relaxed">
          Die KI lernt laufend aus YouTube-Transkripten zum Thema E-Mail-Marketing. Neue Videos
          werden täglich erkannt, transkribiert, gefiltert und zu kompakten Frameworks destilliert.
          Diese fließen automatisch in jede Mail- und Funnel-Generierung ein.
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          Quelle: {SOURCE_CHANNELS.map((c) => c.name).join(", ")}
        </p>
      </div>

      {/* Status-Kacheln */}
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Videos gesamt" value={total} />
        <Stat label="In Wissensbasis" value={counts.get("DISTILLED") ?? 0} highlight />
        <Stat label="In Verarbeitung" value={
          (counts.get("NEW") ?? 0) +
          (counts.get("TRANSCRIBED") ?? 0) +
          (counts.get("RELEVANT") ?? 0)
        } />
        <Stat label="Aussortiert" value={
          (counts.get("IRRELEVANT") ?? 0) + (counts.get("NO_TRANSCRIPT") ?? 0)
        } />
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        {/* Wissensbasis-Dokument */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <p className="label">Destillierte Frameworks</p>
            <span className="font-mono text-[11px] text-muted">
              {kb?.videoCount ?? 0} Videos · Stand {formatDate(kb?.updatedAt ?? null)}
            </span>
          </div>
          {kb?.content?.trim() ? (
            <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap border border-ink/15 bg-white p-5 text-sm leading-relaxed">
              {kb.content}
            </pre>
          ) : (
            <div className="border border-ink/15 p-8 text-center text-sm text-muted">
              Noch keine Frameworks destilliert. Starte den ersten Sync rechts — beim ersten Lauf
              werden Alt-Videos nachgeladen (Backfill). Mehrfach klicken, um aufzuholen.
            </div>
          )}
        </section>

        {/* Steuerung + Status */}
        <aside className="space-y-8">
          <div className="border border-ink/15 p-5">
            <p className="label mb-4">Steuerung</p>
            <KnowledgeSyncButtons />
            <p className="mt-4 border-t border-ink/10 pt-3 font-mono text-[11px] text-muted">
              Letzter Auto-Sync: {formatDate(kb?.lastSyncAt ?? null)}
              <br />
              Backfill: {kb?.backfillDone ? "abgeschlossen" : "ausstehend"}
            </p>
          </div>

          <div className="border border-ink/15 p-5">
            <p className="label mb-4">Status-Übersicht</p>
            <ul className="space-y-2">
              {STATUS_ORDER.filter((s) => (counts.get(s) ?? 0) > 0).map((s) => (
                <li key={s} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{STATUS_LABELS[s]}</span>
                  <span className="font-mono">{counts.get(s) ?? 0}</span>
                </li>
              ))}
              {total === 0 && <li className="text-sm text-muted">Noch keine Videos.</li>}
            </ul>
          </div>
        </aside>
      </div>

      {/* Zuletzt erkannte Videos */}
      <section className="mt-12">
        <p className="label mb-4">Zuletzt erkannte Videos</p>
        {recent.length === 0 ? (
          <p className="border border-ink/15 p-8 text-center text-sm text-muted">
            Noch keine Videos erkannt.
          </p>
        ) : (
          <div className="border border-ink/15 divide-y divide-ink/10">
            {recent.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm hover:underline"
                >
                  {v.title}
                </a>
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                  {STATUS_LABELS[v.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`border p-6 ${highlight ? "border-ink bg-ink/5" : "border-ink/15"}`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-3 text-display text-4xl">{value}</p>
    </div>
  );
}
