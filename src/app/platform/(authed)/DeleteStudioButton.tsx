"use client";

import { deleteStudio } from "./_actions";

/**
 * Löschen-Button für ein Studio mit Sicherheitsabfrage. Das Löschen ist
 * unwiderruflich (Cascade über alle mandanten-bezogenen Daten), daher ein
 * bewusster confirm()-Dialog, der den Studio-Namen und die Kontakt-Zahl nennt.
 */
export function DeleteStudioButton({
  id,
  name,
  contacts,
}: {
  id: string;
  name: string;
  contacts: number;
}) {
  return (
    <form
      action={deleteStudio}
      onSubmit={(e) => {
        const ok = window.confirm(
          `Studio „${name}" wirklich löschen?\n\n` +
            `Dabei werden ${contacts} Kontakt(e) sowie ALLE zugehörigen Daten ` +
            `(Standorte, Tarife, Listen, Kampagnen, Funnels, Admin-Zugänge) ` +
            `unwiderruflich gelöscht.\n\nDas kann NICHT rückgängig gemacht werden.`,
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="font-mono text-xs uppercase tracking-[0.1em] text-red-700 hover:underline"
      >
        Löschen
      </button>
    </form>
  );
}
