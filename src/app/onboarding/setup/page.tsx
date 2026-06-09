import { redirect } from "next/navigation";
import { isCodeRedeemable } from "../_actions";
import { SetupForm } from "./SetupForm";

interface PageProps {
  searchParams: Promise<{ code?: string }>;
}

export const metadata = { title: "Studio einrichten – Details" };

export default async function OnboardingSetupPage({ searchParams }: PageProps) {
  const { code } = await searchParams;
  const normalized = (code ?? "").trim().toUpperCase();

  // Ohne gültigen Code zurück zur Code-Eingabe.
  if (!normalized || !(await isCodeRedeemable(normalized))) {
    redirect("/onboarding?error=invalid");
  }

  return (
    <main className="min-h-screen bg-cream px-6 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <p className="label mb-4">Schritt 2 von 2 · Code {normalized}</p>
        <h1 className="text-display text-4xl leading-[1.05] mb-3">Dein Studio einrichten</h1>
        <p className="mb-10 text-sm leading-relaxed text-ink/70">
          Diese Angaben kannst du später im Backend jederzeit ändern. Tarif und
          Standort legen wir hier schon mal an, damit deine Anmeldeseite sofort
          funktioniert.
        </p>
        <SetupForm code={normalized} />
      </div>
    </main>
  );
}
