import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { LoginForm } from "./LoginForm";

interface PageProps {
  searchParams: Promise<{ from?: string; studio?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const session = await getSession();
  // Nur weiterleiten, wenn das JWT gültig ist UND der zugehörige Admin-User
  // wirklich existiert. Sonst (z.B. verwaistes Cookie mit alter User-ID nach
  // DB-Umbau) würde das authed-Layout sofort zurück hierher leiten →
  // Endlosschleife. In dem Fall zeigen wir das Login-Formular: einmal neu
  // einloggen setzt ein frisches Cookie und bricht die Schleife.
  if (session) {
    const user = await db.adminUser.findUnique({
      where: { id: session.userId },
      select: { id: true },
    });
    if (user) redirect("/admin");
  }

  const { from, studio } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm">
        <p className="label mb-6">Admin · Login</p>
        <h1 className="text-display text-4xl leading-[1] mb-10">Anmelden</h1>
        <LoginForm redirectTo={from || "/admin"} studioSlug={studio ?? ""} />
      </div>
    </main>
  );
}
