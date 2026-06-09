import { db } from "@/lib/db";
import { createCode, revokeCode, reactivateCode } from "./_actions";
import { DeleteStudioButton } from "./DeleteStudioButton";

// Dashboard liest Live-Daten — nie statisch cachen.
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });

const STATUS_STYLE: Record<string, string> = {
  UNUSED: "bg-acid text-ink",
  REDEEMED: "bg-ink text-acid",
  REVOKED: "bg-red-100 text-red-800 line-through",
};

export default async function PlatformDashboard() {
  const [codes, studios] = await Promise.all([
    db.activationCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { studio: { select: { name: true, slug: true, status: true } } },
    }),
    db.studio.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        _count: { select: { contacts: true, adminUsers: true } },
      },
    }),
  ]);

  const unused = codes.filter((c) => c.status === "UNUSED").length;
  const redeemed = codes.filter((c) => c.status === "REDEEMED").length;

  return (
    <div className="space-y-12">
      <header>
        <p className="label mb-2">Übersicht</p>
        <h1 className="text-display text-4xl leading-[1]">Studios &amp; Aktivierungs-Codes</h1>
      </header>

      {/* Statistik */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Studios" value={studios.length} />
        <Stat label="Codes gesamt" value={codes.length} />
        <Stat label="Offen (UNUSED)" value={unused} />
        <Stat label="Eingelöst" value={redeemed} />
      </section>

      {/* Code generieren */}
      <section>
        <p className="label mb-3">Neuen Code erzeugen</p>
        <p className="mb-3 text-xs text-ink/60">
          Den Code löst der Kunde unter <span className="font-mono">/onboarding</span> ein —
          dort entsteht in 2 Schritten sein Studio inkl. Backend.
        </p>
        <form action={createCode} className="flex flex-wrap items-end gap-3">
          <label className="block flex-1 min-w-[220px]">
            <span className="label mb-2 block">Notiz (optional)</span>
            <input
              type="text"
              name="label"
              placeholder="z. B. FitLife Berlin – verkauft 09.06."
              className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
            />
          </label>
          <button
            type="submit"
            className="bg-ink px-5 py-3 font-mono text-sm uppercase tracking-[0.14em] text-acid hover:bg-ink-soft"
          >
            Code generieren →
          </button>
        </form>
      </section>

      {/* Codes-Liste */}
      <section>
        <p className="label mb-3">Codes</p>
        {codes.length === 0 ? (
          <p className="text-sm text-ink/60">Noch keine Codes. Erzeuge oben deinen ersten.</p>
        ) : (
          <div className="overflow-x-auto border-2 border-ink">
            <table className="w-full text-left text-sm">
              <thead className="border-b-2 border-ink font-mono text-xs uppercase tracking-[0.1em]">
                <tr>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Notiz</th>
                  <th className="px-3 py-2">Studio</th>
                  <th className="px-3 py-2">Erstellt</th>
                  <th className="px-3 py-2">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-b border-ink/15 last:border-0">
                    <td className="px-3 py-2 font-mono font-semibold">{c.code}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 font-mono text-xs ${STATUS_STYLE[c.status] ?? ""}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-ink/70">{c.label ?? "—"}</td>
                    <td className="px-3 py-2">
                      {c.studio ? (
                        <span className="font-mono text-xs">
                          {c.studio.name} <span className="text-ink/50">({c.studio.slug})</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-ink/60">{dateFmt.format(c.createdAt)}</td>
                    <td className="px-3 py-2">
                      {c.status === "UNUSED" && (
                        <form action={revokeCode}>
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            type="submit"
                            className="font-mono text-xs uppercase tracking-[0.1em] text-red-700 hover:underline"
                          >
                            Sperren
                          </button>
                        </form>
                      )}
                      {c.status === "REVOKED" && (
                        <form action={reactivateCode}>
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            type="submit"
                            className="font-mono text-xs uppercase tracking-[0.1em] hover:underline"
                          >
                            Reaktivieren
                          </button>
                        </form>
                      )}
                      {c.status === "REDEEMED" && <span className="text-ink/40">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Studios-Liste */}
      <section>
        <p className="label mb-3">Studios</p>
        {studios.length === 0 ? (
          <p className="text-sm text-ink/60">Noch keine Studios.</p>
        ) : (
          <div className="overflow-x-auto border-2 border-ink">
            <table className="w-full text-left text-sm">
              <thead className="border-b-2 border-ink font-mono text-xs uppercase tracking-[0.1em]">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Kontakte</th>
                  <th className="px-3 py-2">Admins</th>
                  <th className="px-3 py-2">Seit</th>
                  <th className="px-3 py-2">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {studios.map((s) => (
                  <tr key={s.id} className="border-b border-ink/15 last:border-0">
                    <td className="px-3 py-2 font-semibold">{s.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-ink/70">{s.slug}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 font-mono text-xs ${STATUS_STYLE[s.status] ?? "bg-ink/10"}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{s._count.contacts}</td>
                    <td className="px-3 py-2 tabular-nums">{s._count.adminUsers}</td>
                    <td className="px-3 py-2 text-ink/60">{dateFmt.format(s.createdAt)}</td>
                    <td className="px-3 py-2">
                      <DeleteStudioButton id={s.id} name={s.name} contacts={s._count.contacts} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-2 border-ink p-4">
      <p className="label mb-1">{label}</p>
      <p className="text-display text-3xl tabular-nums">{value}</p>
    </div>
  );
}
