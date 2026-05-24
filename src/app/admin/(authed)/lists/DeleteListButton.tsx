"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteList } from "@/app/admin/_actions";

interface Props {
  listId: string;
  listName: string;
}

/**
 * Client-Wrapper für den "Liste löschen"-Knopf in der Übersicht.
 * Server Components dürfen keine onClick-Handler an Buttons binden —
 * das confirm() braucht daher einen Client-Wrapper.
 */
export function DeleteListButton({ listId, listName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm(
        `Liste „${listName}" wirklich löschen? Mitglieder bleiben erhalten, nur die Gruppierung wird entfernt.`,
      )
    )
      return;

    startTransition(async () => {
      try {
        await deleteList(listId);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NEXT_REDIRECT")) return;
        alert("Löschen fehlgeschlagen: " + msg);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="font-mono text-xs uppercase tracking-[0.1em] text-muted hover:text-red-700 disabled:opacity-50"
    >
      {isPending ? "Lösche…" : "Löschen"}
    </button>
  );
}
