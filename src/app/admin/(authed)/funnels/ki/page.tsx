import Link from "next/link";
import { db } from "@/lib/db";
import { KiCreator } from "@/components/admin/KiCreator";

export default async function KiCreatePage() {
  const locations = await db.location.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <div className="p-8 md:p-12">
      <Link
        href="/admin/funnels"
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-ink"
      >
        ← Zurück
      </Link>

      <div className="mt-6 mb-10 max-w-2xl">
        <p className="label">KI</p>
        <h1 className="mt-2 text-display text-5xl">Mit KI erstellen</h1>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          Wähle, ob die KI eine einzelne Mail oder einen kompletten Funnel mit mehreren Mails
          schreiben soll. Die KI nutzt dabei automatisch die laufend aktualisierte{" "}
          <Link href="/admin/knowledge" className="underline hover:text-ink">
            Wissensbasis
          </Link>
          .
        </p>
      </div>

      <div className="max-w-4xl">
        <KiCreator locations={locations} />
      </div>
    </div>
  );
}
