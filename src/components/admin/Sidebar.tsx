"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  // Drawer schließen wenn Route wechselt
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Body-Scroll blocken solange Drawer offen
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const navList = (
    <ul className="space-y-1">
      {NAV.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-3 font-mono text-xs uppercase tracking-[0.12em] md:py-2 ${
                active ? "bg-ink text-acid" : "hover:bg-ink/5"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* ─── MOBILE: Top-Bar (fixed) ─── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-ink/15 bg-cream px-4">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Admin</span>
          <span className="text-display text-lg leading-none">Studio</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menü öffnen"
          className="-mr-2 flex h-10 w-10 items-center justify-center"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="7" x2="21" y2="7" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="17" x2="21" y2="17" />
          </svg>
        </button>
      </header>

      {/* ─── MOBILE: Drawer-Overlay (nur wenn offen) ─── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-ink/60"
          onClick={() => setOpen(false)}
          aria-hidden
        >
          <aside
            className="absolute left-0 top-0 bottom-0 flex w-72 max-w-[85%] flex-col bg-cream"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-ink/15 p-6">
              <div>
                <p className="label">Admin</p>
                <p className="mt-2 text-display text-2xl">Studio</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Menü schließen"
                className="-mr-2 -mt-2 flex h-10 w-10 items-center justify-center"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4">{navList}</nav>

            <div className="border-t border-ink/15 p-4">
              <p className="mb-3 truncate font-mono text-[10px] text-muted">{adminEmail}</p>
              <button
                onClick={logout}
                className="w-full border border-ink/20 px-3 py-3 font-mono text-xs uppercase tracking-[0.12em] hover:bg-ink hover:text-cream"
              >
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ─── DESKTOP: Sidebar (unverändert) ─── */}
      <aside className="hidden md:flex w-64 flex-col border-r border-ink/15 bg-cream">
        <div className="border-b border-ink/15 p-6">
          <p className="label">Admin</p>
          <p className="mt-2 text-display text-2xl">Studio</p>
        </div>

        <nav className="flex-1 p-4">{navList}</nav>

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
    </>
  );
}
