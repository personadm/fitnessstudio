"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Übersicht" },
  { href: "/admin/contacts", label: "Kontakte" },
  { href: "/admin/locations", label: "Standorte" },
  { href: "/admin/plans", label: "Tarife" },
  { href: "/admin/lists", label: "Listen" },
  { href: "/admin/campaigns", label: "Newsletter" },
  { href: "/admin/funnels", label: "Funnels" },
];

export function AdminSidebar({ adminEmail }: { adminEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex w-64 flex-col border-r border-ink/15 bg-cream">
      <div className="border-b border-ink/15 p-6">
        <p className="label">Admin</p>
        <p className="mt-2 text-display text-2xl">Studio</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] ${
                    active ? "bg-ink text-acid" : "hover:bg-ink/5"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-ink/15 p-4">
        <p className="mb-3 truncate font-mono text-[10px] text-muted">{adminEmail}</p>
        <button
          onClick={logout}
          className="w-full border border-ink/20 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-ink hover:text-cream"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
