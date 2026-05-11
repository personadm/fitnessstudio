import { redirect } from "next/navigation";
import { after } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { processFunnels } from "@/lib/funnels";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const user = await db.adminUser.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!user) redirect("/admin/login");

  // Phase 6: Funnel-Verarbeitung läuft im Hintergrund nach jedem
  // Admin-Aufruf. Rate-limited auf 5 Min — d.h. die meisten Aufrufe
  // sind ein No-Op, aber alle 5 Min wird tatsächlich verarbeitet.
  // Läuft NACH dem Response, blockiert also nicht das Rendering.
  after(async () => {
    try {
      await processFunnels();
    } catch (err) {
      console.error("[funnels] background processing failed", err);
    }
  });

  return (
    <div className="flex min-h-screen bg-cream">
      <AdminSidebar adminEmail={user.email} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}
