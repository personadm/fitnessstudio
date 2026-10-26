import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { accessFor } from "@/lib/schichtplan/access";
import { todayInBerlin } from "@/lib/schichtplan/calendar";
import { checkPlan } from "@/lib/schichtplan/checks";
import { buildAccounts } from "@/lib/schichtplan/konten";
import { loadTeamPlan } from "@/lib/schichtplan/plan";
import { LEITUNG_VIEWS, PLAN_VIEWS, type ViewMode } from "@/lib/schichtplan/views";
import { ScheduleView } from "./ScheduleView";

// Code-Prüfung braucht process.env zur Laufzeit; nie statisch cachen.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Schichtplan",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  // Der Code steht in der URL — nie als Referrer weitergeben.
  referrer: "no-referrer",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ ansicht?: string; datum?: string }>;
}

/**
 * Versteckte Seite: /team/<code>, nur lesend, ohne Login, nirgends verlinkt.
 *
 * Mit dem Team-Code: Schichten und Termine. Mit dem Leitungs-Code zusätzlich
 * Stundenkonten, Kosten und Regelprüfung — diese Daten werden nur dann
 * berechnet und an den Browser geschickt.
 */
export default async function TeamSchedulePage({ params, searchParams }: PageProps) {
  const { code } = await params;
  const access = accessFor(code);
  if (!access) notFound();

  const plan = loadTeamPlan();
  const leitung = access === "leitung" ? { accounts: buildAccounts(plan), findings: checkPlan(plan) } : null;
  const allowedViews: readonly ViewMode[] = leitung ? [...PLAN_VIEWS, ...LEITUNG_VIEWS] : PLAN_VIEWS;

  const query = await searchParams;
  const initialView = allowedViews.find((mode) => mode === query.ansicht) ?? "woche";
  const initialDate = query.datum && ISO_DATE.test(query.datum) ? query.datum : null;

  return (
    <>
      <style>{"@media print { @page { size: A4 landscape; margin: 8mm; } }"}</style>
      <ScheduleView
        plan={plan}
        today={todayInBerlin()}
        initialView={initialView}
        initialDate={initialDate}
        leitung={leitung}
      />
    </>
  );
}
