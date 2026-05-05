import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminSidebar } from "@/components/admin/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const user = await db.adminUser.findUnique({
    where: { id: session.userId },
    select: { email: true },
  });
  if (!user) redirect("/admin/login");

  return (
    <div className="flex min-h-screen bg-cream">
      <AdminSidebar adminEmail={user.email} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
