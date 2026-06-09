"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ActivityKind =
  | "LEAD"
  | "DOI_CONFIRMED"
  | "SIGNUP_ONLINE"
  | "SIGNUP_CLUB"
  | "FUNNEL_MAIL"
  | "CAMPAIGN_MAIL";

type Item = {
  id: string;
  kind: ActivityKind;
  at: string;
  title: string;
  subtitle?: string;
  contactId?: string;
  href?: string;
};

const ICONS: Record<ActivityKind, string> = {
  LEAD: "📥",
  DOI_CONFIRMED: "✓",
  SIGNUP_ONLINE: "🎉",
  SIGNUP_CLUB: "🏠",
  FUNNEL_MAIL: "📧",
  CAMPAIGN_MAIL: "📨",
};

const COLORS: Record<ActivityKind, string> = {
  LEAD: "text-ink-soft",
  DOI_CONFIRMED: "text-ink-soft",
  SIGNUP_ONLINE: "text-green-700 font-medium",
  SIGNUP_CLUB: "text-green-700 font-medium",
  FUNNEL_MAIL: "text-ink-soft",
  CAMPAIGN_MAIL: "text-ink-soft",
};

export function LiveActivity() {
  const [items, setItems] = useState<Item[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set());
  const isFirstFetch = useRef(true);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchActivity() {
      try {
        const res = await fetch("/api/admin/activity", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { items: Item[] };
        if (cancelled) return;

        // Neue Items markieren für sanfte Einblendung
        if (!isFirstFetch.current) {
          const fresh = new Set<string>();
          for (const item of data.items) {
            if (!knownIds.current.has(item.id)) fresh.add(item.id);
          }
          if (fresh.size > 0) {
            setNewIds(fresh);
            // Highlight nach 3 Sekunden entfernen — Timer wird referenziert und
            // beim Unmount gecleart, damit kein State-Update auf unmounted läuft.
            if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
            highlightTimerRef.current = setTimeout(() => {
              if (!cancelled) setNewIds(new Set());
            }, 3000);
          }
        }
        for (const item of data.items) knownIds.current.add(item.id);
        isFirstFetch.current = false;

        setItems(data.items);
        setLastUpdate(new Date());
        setError(false);
      } catch (e) {
        if (!cancelled) setError(true);
      }
    }

    fetchActivity();
    const id = setInterval(fetchActivity, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <p className="label">Live · was passiert gerade</p>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          {error ? (
            <span className="text-red-700">offline</span>
          ) : (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-green-600 animate-pulse" />
              <span className="text-muted">
                {lastUpdate ? `aktualisiert ${formatRelative(lastUpdate)}` : "lädt …"}
              </span>
            </>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="border border-ink/15 p-8 text-center text-sm text-muted">
          Noch keine Aktivität in den letzten 14 Tagen.
        </div>
      ) : (
        <ul className="border border-ink/15 divide-y divide-ink/10 max-h-[28rem] overflow-y-auto">
          {items.map((item) => {
            const isNew = newIds.has(item.id);
            const Inner = (
              <div
                className={
                  "flex items-start gap-3 px-4 py-3 transition-colors " +
                  (isNew ? "bg-acid/30" : "hover:bg-ink/5")
                }
              >
                <span className="text-xl leading-none mt-0.5 flex-shrink-0">
                  {ICONS[item.kind]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={"text-sm leading-snug " + COLORS[item.kind]}>{item.title}</p>
                  {item.subtitle && (
                    <p className="mt-0.5 text-xs text-muted truncate">{item.subtitle}</p>
                  )}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted whitespace-nowrap mt-1">
                  {formatRelative(new Date(item.at))}
                </span>
              </div>
            );
            return (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className="block">
                    {Inner}
                  </Link>
                ) : (
                  Inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatRelative(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 5) return "jetzt";
  if (sec < 60) return `vor ${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `vor ${min} Min`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std`;
  const days = Math.round(h / 24);
  if (days < 7) return `vor ${days}d`;
  return d.toLocaleDateString("de-DE");
}
