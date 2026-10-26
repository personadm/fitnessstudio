import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isTeamCodeValid } from "@/lib/schichtplan/access";
import { todayInBerlin } from "@/lib/schichtplan/calendar";
import { loadTeamPlan } from "@/lib/schichtplan/plan";
import { ScheduleView, type ViewMode } from "./ScheduleView";

// Code-Prüfung braucht process.env zur Laufzeit; nie statisch cachen.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Schichtplan",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  // Der Code steht in der URL — nie als Referrer weitergeben.
  referrer: "no-referrer",
};

const VIEW_MODES: readonly ViewMode[] = ["woche", "liste", "tag"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ ansicht?: string; datum?: string }>;
}

/**
 * Versteckte Team-Seite: /team/<SCHICHTPLAN_CODE>
 *
 * Nur lesend, ohne Login, nirgends verlinkt. Zeigt Schichten und Termine aus
 * dem Übergabe-Planstand — keine Löhne, Stundenkonten oder Kosten.
 */
export default async function TeamSchedulePage({ params, searchParams }: PageProps) {
  const { code } = await params;
  if (!isTeamCodeValid(code)) notFound();

  const query = await searchParams;
  const initialView = VIEW_MODES.find((mode) => mode === query.ansicht) ?? "woche";
  const initialDate = query.datum && ISO_DATE.test(query.datum) ? query.datum : null;

  return (
    <>
      <style>{"@media print { @page { size: A4 landscape; margin: 8mm; } }"}</style>
      <ScheduleView
        plan={loadTeamPlan()}
        today={todayInBerlin()}
        initialView={initialView}
        initialDate={initialDate}
      />
    </>
  );
}
