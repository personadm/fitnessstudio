import { redirect } from "next/navigation";
import { getPlatformSession } from "@/lib/platformAuth";
import { db } from "@/lib/db";
import { platformLogout } from "./_actions";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getPlatformSession();
  if (!session) redirect("/platform/login");

  const admin = await db.platformAdmin.findUnique({
    where: { id: session.platformAdminId },
    select: { email: true },
  });
  if (!admin) redirect("/platform/login");

  return (
    <div className="min-h-screen bg-cream">
      <header className="flex items-center justify-between border-b-2 border-ink px-6 py-4">
        <div>
          <p className="label">Plattform-Betreiber</p>
          <p className="font-mono text-sm">{admin.email}</p>
        </div>
        <form action={platformLogout}>
          <button
            type="submit"
            className="border-2 border-ink px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] hover:bg-ink hover:text-acid"
          >
            Logout
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
