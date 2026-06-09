"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  bulkAddContactsToList,
  bulkAddByStatusToList,
  countContactsForBulkAdd,
} from "@/app/admin/_actions";

interface SearchResult {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  alreadyInList: boolean;
}

interface LocationOption {
  id: string;
  name: string;
}

interface Props {
  listId: string;
  locations: LocationOption[];
}

type Status = "INTERESSENT" | "NEUKUNDE" | "KUNDE" | "EHEMALIGER";

const STATUS_LABELS: Record<Status, string> = {
  INTERESSENT: "Interessenten",
  NEUKUNDE: "Neukunden",
  KUNDE: "Kunden",
  EHEMALIGER: "Ehemalige",
};

/**
 * Personen zu einer Liste hinzufügen — drei Wege parallel:
 *
 *  1. SUCHE + MULTI-SELECT — tippst Name oder Mail, kriegst bis 50 Treffer,
 *     hakst mehrere ab, "X hinzufügen" Button fügt alle auf einmal hinzu.
 *
 *  2. KATEGORIE — Buttons für "Alle Interessenten", "Alle Kunden" etc.
 *     Erst Klick zeigt Vorschau-Anzahl an, zweiter Klick bestätigt.
 *
 *  3. STANDORT-FILTER — wenn der Studio mehrere Standorte hat, kann die
 *     Kategorie-Aktion auf einen Standort eingeschränkt werden.
 */
export function AddContactPanel({ listId, locations }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // SEARCH-Tab State
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // CATEGORY-Tab State
  const [filterLocationId, setFilterLocationId] = useState<string>("");
  const [statusPreview, setStatusPreview] = useState<Record<Status, number | null>>({
    INTERESSENT: null,
    NEUKUNDE: null,
    KUNDE: null,
    EHEMALIGER: null,
  });
  const [confirmStatus, setConfirmStatus] = useState<Status | null>(null);

  // Such-Logik
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    // AbortController verhindert, dass eine langsamere ältere Antwort eine
    // neuere überschreibt (Race Condition bei schnellem Tippen).
    const controller = new AbortController();

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/contacts/search?q=${encodeURIComponent(query.trim())}&listId=${encodeURIComponent(listId)}`,
          { signal: controller.signal },
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
        } else {
          setResults([]);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [query, listId]);

  // Wenn Filter (Status oder Location) sich ändert, alle Counts neu laden
  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      const next: Record<Status, number | null> = {
        INTERESSENT: null,
        NEUKUNDE: null,
        KUNDE: null,
        EHEMALIGER: null,
      };
      for (const status of Object.keys(STATUS_LABELS) as Status[]) {
        try {
          const count = await countContactsForBulkAdd(
            listId,
            status,
            filterLocationId || null,
          );
          if (cancelled) return;
          next[status] = count;
        } catch {
          if (cancelled) return;
          next[status] = 0;
        }
      }
      if (!cancelled) setStatusPreview(next);
    }
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [listId, filterLocationId]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllResults() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const r of results) {
        if (!r.alreadyInList) next.add(r.id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handleBulkAdd() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    startTransition(async () => {
      try {
        const result = await bulkAddContactsToList(listId, ids);
        if (result.ok) {
          setSelectedIds(new Set());
          setQuery("");
          setResults([]);
          router.refresh();
        } else {
          alert(result.message ?? "Hinzufügen fehlgeschlagen.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        alert("Hinzufügen fehlgeschlagen: " + msg);
      }
    });
  }

  function handleCategoryAdd(status: Status) {
    startTransition(async () => {
      try {
        const result = await bulkAddByStatusToList(listId, status, filterLocationId || null);
        if (result.ok) {
          setConfirmStatus(null);
          router.refresh();
        } else {
          alert("Hinzufügen fehlgeschlagen.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        alert("Hinzufügen fehlgeschlagen: " + msg);
      }
    });
  }

  const selectableResults = results.filter((r) => !r.alreadyInList);

  return (
    <div className="space-y-6">
      {/* WEG 1: Kategorie-Quick-Add */}
      <div className="border border-ink/15 p-4 space-y-4">
        <div>
          <p className="label">Ganze Kategorien hinzufügen</p>
          <p className="mt-1 text-xs text-muted">
            Fügt alle Kontakte mit dem gewählten Status hinzu — bereits-Mitglieder werden übersprungen.
          </p>
        </div>

        {locations.length > 0 && (
          <div>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                Standort-Filter (optional)
              </span>
              <select
                value={filterLocationId}
                onChange={(e) => setFilterLocationId(e.target.value)}
                className="mt-1 w-full border-b border-ink/20 bg-transparent py-2 text-sm focus:border-ink focus:outline-none"
              >
                <option value="">Alle Standorte</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {(Object.keys(STATUS_LABELS) as Status[]).map((status) => {
            const count = statusPreview[status];
            const isConfirming = confirmStatus === status;
            const empty = count === 0;

            if (isConfirming) {
              return (
                <div key={status} className="border border-acid bg-acid/20 p-3 text-center space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em]">
                    {count} {STATUS_LABELS[status]} hinzufügen?
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleCategoryAdd(status)}
                      disabled={isPending}
                      className="flex-1 bg-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-acid hover:bg-ink-soft disabled:opacity-50"
                    >
                      {isPending ? "..." : "Ja"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmStatus(null)}
                      disabled={isPending}
                      className="flex-1 border border-ink/20 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-ink/5 disabled:opacity-50"
                    >
                      Nein
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={status}
                type="button"
                onClick={() => setConfirmStatus(status)}
                disabled={empty || isPending}
                className="border border-ink/20 p-3 text-left hover:border-ink/40 hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                  {STATUS_LABELS[status]}
                </p>
                <p className="mt-1 font-mono text-xl">
                  {count === null ? "…" : `+${count}`}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* WEG 2: Einzeln/Mehrere via Suche */}
      <div className="border border-ink/15 p-4 space-y-3">
        <div>
          <p className="label">Einzelne Personen suchen</p>
          <p className="mt-1 text-xs text-muted">
            Name oder E-Mail tippen (mind. 2 Zeichen). Mehrere abhaken, dann „Hinzufügen".
          </p>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="z.B. Mustermann oder anna@…"
          className="w-full border-b border-ink/20 bg-transparent py-2 text-base placeholder:text-muted/60 focus:border-ink focus:outline-none"
        />

        {searching && (
          <p className="font-mono text-[11px] text-muted">Suche…</p>
        )}

        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <p className="font-mono text-[11px] text-muted">
            Keine Kontakte gefunden für „{query}".
          </p>
        )}

        {results.length > 0 && (
          <>
            <div className="flex items-center justify-between border-b border-ink/10 pb-2">
              <p className="font-mono text-[11px] text-muted">
                {results.length} Treffer · {selectableResults.length} hinzufügbar
              </p>
              {selectableResults.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllResults}
                  className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted hover:text-ink"
                >
                  Alle markieren
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto divide-y divide-ink/10">
              {results.map((r) => {
                const name =
                  r.firstName || r.lastName
                    ? `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim()
                    : "—";
                const isSelected = selectedIds.has(r.id);

                if (r.alreadyInList) {
                  return (
                    <div key={r.id} className="flex items-center gap-3 py-2 opacity-50">
                      <div className="w-4" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{name}</p>
                        <p className="font-mono text-[11px] text-muted">
                          {r.email} · {r.status}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-acid_dark">
                        ✓ in Liste
                      </span>
                    </div>
                  );
                }

                return (
                  <label
                    key={r.id}
                    className={`flex cursor-pointer items-center gap-3 py-2 hover:bg-ink/5 ${
                      isSelected ? "bg-ink/10" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(r.id)}
                      className="h-4 w-4 accent-ink"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{name}</p>
                      <p className="font-mono text-[11px] text-muted">
                        {r.email} · {r.status}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}

        {/* Action-Bar wenn Auswahl > 0 */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between border-t border-ink/15 pt-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em]">
              {selectedIds.size} ausgewählt
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearSelection}
                disabled={isPending}
                className="border border-ink/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] hover:bg-ink/5 disabled:opacity-50"
              >
                Auswahl aufheben
              </button>
              <button
                type="button"
                onClick={handleBulkAdd}
                disabled={isPending}
                className="bg-ink px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-acid hover:bg-ink-soft disabled:opacity-50"
              >
                {isPending ? "Füge hinzu…" : `+ ${selectedIds.size} hinzufügen`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
