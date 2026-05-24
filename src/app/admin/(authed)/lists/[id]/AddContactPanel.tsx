"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addContactToList } from "@/app/admin/_actions";

interface SearchResult {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  alreadyInList: boolean;
}

interface Props {
  listId: string;
}

/**
 * Live-Search-Panel zum Hinzufügen von Kontakten zu einer Liste.
 *
 *  - Tippen löst Search via /api/admin/contacts/search aus (debounced 300ms)
 *  - Ergebnisse zeigen Status und ob Kontakt schon in der Liste ist
 *  - Klick auf "Hinzufügen" ruft addContactToList Server-Action, refresht Page
 */
export function AddContactPanel({ listId }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/contacts/search?q=${encodeURIComponent(query.trim())}&listId=${encodeURIComponent(listId)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, listId]);

  function handleAdd(contactId: string) {
    startTransition(async () => {
      try {
        await addContactToList(contactId, listId);
        setJustAdded((prev) => new Set(prev).add(contactId));
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NEXT_REDIRECT")) return;
        alert("Hinzufügen fehlgeschlagen: " + msg);
      }
    });
  }

  return (
    <div className="border border-ink/15 p-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Name oder E-Mail eingeben (mind. 2 Zeichen)…"
        className="w-full border-b border-ink/20 bg-transparent py-2 text-base placeholder:text-muted/60 focus:border-ink focus:outline-none"
      />

      {searching && (
        <p className="mt-3 font-mono text-[11px] text-muted">Suche…</p>
      )}

      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-3 font-mono text-[11px] text-muted">
          Keine Kontakte gefunden für „{query}".
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-4 max-h-[400px] overflow-y-auto divide-y divide-ink/10">
          {results.map((r) => {
            const name =
              r.firstName || r.lastName
                ? `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim()
                : "—";
            const isInList = r.alreadyInList || justAdded.has(r.id);

            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{name}</p>
                  <p className="font-mono text-[11px] text-muted">
                    {r.email} · {r.status}
                  </p>
                </div>
                {isInList ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-acid_dark">
                    ✓ in Liste
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAdd(r.id)}
                    disabled={isPending}
                    className="border border-ink/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] hover:bg-ink hover:text-cream disabled:opacity-50"
                  >
                    + Hinzufügen
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
