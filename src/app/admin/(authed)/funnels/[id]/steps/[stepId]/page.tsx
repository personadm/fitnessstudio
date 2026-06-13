import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateFunnelStep } from "@/app/admin/_actions";
import { EditStepForm } from "./EditStepForm";

interface PageProps {
  params: Promise<{ id: string; stepId: string }>;
}

export default async function EditStepPage({ params }: PageProps) {
  const { id: funnelId, stepId } = await params;

  const step = await db.funnelStep.findFirst({
    where: { id: stepId },
    include: {
      funnel: {
        select: {
          id: true,
          name: true,
          scheduleWeekday: true,
        },
      },
    },
  });

  if (!step || step.funnelId !== funnelId) {
    notFound();
  }

  // Server-Action mit gebundenen IDs
  const submitAction = updateFunnelStep.bind(null, stepId, funnelId);

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      <Link
        href={`/admin/funnels/${funnelId}`}
        className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink"
      >
        ← {step.funnel.name}
      </Link>
      <h1 className="mt-4 text-display text-4xl leading-tight md:text-5xl">
        Schritt {step.orderNum} bearbeiten
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Hier kannst du Betreff, Wartezeit, Hybrid-Wochentag und den HTML-Body
        dieses Mail-Schritts anpassen. Änderungen wirken sofort für alle
        Kontakte, die diesen Schritt noch nicht erhalten haben.
      </p>
      <div className="mt-8">
        <EditStepForm
          stepId={step.id}
          funnelId={funnelId}
          initialSubject={step.subject}
          initialBodyHtml={step.bodyHtml}
          initialDelayDays={step.delayDays}
          initialDelayHours={(step as { delayHours?: number }).delayHours ?? 0}
          initialScheduleWeekday={
            (step as { scheduleWeekday?: number | null }).scheduleWeekday ?? null
          }
          initialScheduleHour={
            (step as { scheduleHour?: number | null }).scheduleHour ?? null
          }
          initialScheduleMinute={
            (step as { scheduleMinute?: number | null }).scheduleMinute ?? null
          }
          funnelLegacyScheduleEnabled={step.funnel.scheduleWeekday !== null}
          action={submitAction}
        />
      </div>
    </div>
  );
}
