"use client";

import { useState, useTransition } from "react";
import {
  updateContactStatus,
  updateContactNotes,
  deleteContact,
  addContactToList,
  removeContactFromList,
} from "@/app/admin/_actions";
import type { ContactStatus } from "@prisma/client";

const STATUSES: ContactStatus[] = ["INTERESSENT", "NEUKUNDE", "KUNDE", "EHEMALIGER"];

interface Props {
  contact: { id: string; status: ContactStatus; notes: string | null };
  lists: Array<{ id: string; name: string }>;
  assignedListIds: string[];
}

export function ContactDetailActions({ contact, lists, assignedListIds }: Props) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(contact.notes ?? "");

  return (
    <div className="space-y-8">
      {/* Status ändern */}
      <section>
        <p className="label mb-3">Status</p>
        <div className="space-y-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              disabled={isPending || s === contact.status}
              onClick={() =>
                startTransition(() => {
                  updateContactStatus(contact.id, s);
                })
              }
              className={`block w-full px-3 py-2 text-left font-mono text-xs uppercase tracking-[0.1em] disabled:cursor-default ${
                s === contact.status
                  ? "bg-ink text-acid"
                  : "border border-ink/20 hover:bg-ink hover:text-cream"
              }`}
            >
              {s === contact.status ? "✓ " : ""}
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* Listen */}
      <section>
        <p className="label mb-3">Listen</p>
        {lists.length === 0 ? (
          <p className="text-xs text-muted">Noch keine Listen angelegt.</p>
        ) : (
          <div className="space-y-2">
            {lists.map((l) => {
              const isOn = assignedListIds.includes(l.id);
              return (
                <label key={l.id} className="flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={isOn}
                    disabled={isPending}
                    onChange={(e) =>
                      startTransition(() => {
                        if (e.target.checked) addContactToList(contact.id, l.id);
                        else removeContactFromList(contact.id, l.id);
                      })
                    }
                    className="h-4 w-4 accent-ink"
                  />
                  {l.name}
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* Notizen */}
      <section>
        <p className="label mb-3">Notizen</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== (contact.notes ?? "")) {
              startTransition(() => updateContactNotes(contact.id, notes));
            }
          }}
          rows={5}
          placeholder="Interne Notizen…"
          className="w-full border border-ink/20 bg-transparent p-3 text-sm outline-none focus:border-ink"
        />
      </section>

      {/* Löschen */}
      <section>
        <p className="label mb-3">Gefahrenzone</p>
        <button
          disabled={isPending}
          onClick={() => {
            if (confirm("Kontakt wirklich endgültig löschen? Das kann nicht rückgängig gemacht werden.")) {
              startTransition(() => deleteContact(contact.id));
            }
          }}
          className="w-full border border-red-700/40 px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] text-red-700 hover:bg-red-700 hover:text-cream"
        >
          Kontakt löschen
        </button>
      </section>
    </div>
  );
}
