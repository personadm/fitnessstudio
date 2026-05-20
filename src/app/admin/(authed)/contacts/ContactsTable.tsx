"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContactStatus } from "@prisma/client";
import { bulkDeleteContacts } from "@/app/admin/_actions";

interface ContactRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: ContactStatus;
  source: string;
  createdAt: string; // serialisiert als ISO
  pricingPlan: { name: string } | null;
  location: { name: string } | null;
}

interface Props {
  contacts: ContactRow[];
  showLocationColumn: boolean;
}

/**
 * Tabelle mit Bulk-Auswahl. Beim Auswählen einer oder mehrerer Zeilen
 * erscheint eine Sticky-Toolbar oben mit der „Löschen"-Aktion.
 *
 * Auswahl wird nicht über die URL persistiert — wenn der User filter wechselt,
 * resettet sich die Auswahl absichtlich (Sicherheit: keine versteckten
 * vorausgewählten Kontakte aus anderem Filter).
 */
export function ContactsTable({ contacts, showLocationColumn }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const allSelected = contacts.length > 0 && selected.size === contacts.length;
  const someSelected = selected.size > 0;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === contacts.length) return new Set();
      return new Set(contacts.map((c) => c.id));
    });
  }

  function clearSelection() {
    setSelected(new Set());
    setConfirming(false);
  }

  function handleDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    startTransition(async () => {
      const result = await bulkDeleteContacts(ids);
      if (result.ok) {
        setSelected(new Set());
        setConfirming(false);
        router.refresh();
      } else {
        alert(result.message ?? "Löschen fehlgeschlagen.");
      }
    });
  }

  return (
    <>
      {/* Bulk-Aktion-Toolbar — sticky oben wenn Auswahl > 0 */}
      {someSelected && (
        <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-3 border border-ink bg-ink p-3 text-cream md:p-4">
          <p className="font-mono text-xs uppercase tracking-[0.12em]">
            {selected.size} {selected.size === 1 ? "Kontakt" : "Kontakte"} ausgewählt
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearSelection}
              disabled={isPending}
              className="border border-cream/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-cream/10 disabled:opacity-50"
            >
              Auswahl aufheben
            </button>
            {confirming ? (
              <>
                <span className="font-mono text-[11px] text-red-300">
                  Wirklich löschen?
                </span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="bg-red-700 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-cream hover:bg-red-800 disabled:opacity-50"
                >
                  {isPending
                    ? "Lösche…"
                    : `Ja, ${selected.size} ${selected.size === 1 ? "Kontakt" : "Kontakte"} löschen`}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={isPending}
                  className="border border-cream/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-cream/10 disabled:opacity-50"
                >
                  Abbrechen
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="border border-red-300 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-red-300 hover:bg-red-700"
              >
                Löschen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabelle */}
      <div className="border border-ink/15">
        <table className="w-full text-sm">
          <thead className="border-b border-ink/15 bg-ink/5">
            <tr className="text-left">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-ink"
                  aria-label="Alle auswählen"
                />
              </th>
              <Th>Name / E-Mail</Th>
              <Th>Status</Th>
              {showLocationColumn && <Th>Standort</Th>}
              <Th>Tarif</Th>
              <Th>Quelle</Th>
              <Th>Eingetragen</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {contacts.length === 0 ? (
              <tr>
                <td
                  colSpan={showLocationColumn ? 7 : 6}
                  className="p-8 text-center text-sm text-muted"
                >
                  Keine Einträge gefunden.
                </td>
              </tr>
            ) : (
              contacts.map((c) => {
                const isSel = selected.has(c.id);
                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-ink/5 ${isSel ? "bg-ink/10" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleOne(c.id)}
                        className="h-4 w-4 accent-ink"
                        aria-label={`${c.email} auswählen`}
                      />
                    </td>
                    <Td>
                      <Link href={`/admin/contacts/${c.id}`} className="block">
                        <p className="font-medium">
                          {c.firstName || c.lastName
                            ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
                            : "—"}
                        </p>
                        <p className="font-mono text-[11px] text-muted">{c.email}</p>
                      </Link>
                    </Td>
                    <Td>
                      <StatusBadge status={c.status} />
                    </Td>
                    {showLocationColumn && (
                      <Td className="text-xs">
                        {c.location?.name ?? <span className="text-muted">—</span>}
                      </Td>
                    )}
                    <Td>{c.pricingPlan?.name ?? "—"}</Td>
                    <Td className="font-mono text-[10px] uppercase text-muted">
                      {c.source}
                    </Td>
                    <Td className="font-mono text-[11px] text-muted">
                      {new Date(c.createdAt).toLocaleDateString("de-DE")}
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function StatusBadge({ status }: { status: ContactStatus }) {
  const colors: Record<ContactStatus, string> = {
    INTERESSENT: "bg-cream border-ink/30 text-ink",
    NEUKUNDE: "bg-acid text-ink border-acid_dark",
    KUNDE: "bg-ink text-acid border-ink",
    EHEMALIGER: "bg-cream border-ink/30 text-muted",
  };
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] ${colors[status]}`}
    >
      {status}
    </span>
  );
}
