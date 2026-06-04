"use client";

import { useState } from "react";
import { AIEmailComposer } from "./AIEmailComposer";
import { ManualEmailComposer } from "./ManualEmailComposer";

interface Props {
  kind: "funnel" | "newsletter";
  onGenerated: (subject: string, bodyHtml: string) => void;
}

type Mode = "ai" | "manual";

/**
 * Wrapper mit zwei Modi für die Mail-Erstellung:
 * – KI-generiert (Hormozi-Frameworks)
 * – selbst schreiben (Markdown-Stil + Bild-Upload)
 *
 * Der frühere "Aus Pages-Datei"-Modus (DocxImporter) wurde entfernt.
 */
export function EmailComposer({ kind, onGenerated }: Props) {
  const [mode, setMode] = useState<Mode>("ai");

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 border-b border-ink/15">
        <TabButton active={mode === "ai"} onClick={() => setMode("ai")}>
          ✨ Mit KI
        </TabButton>
        <TabButton active={mode === "manual"} onClick={() => setMode("manual")}>
          ✍️ Selbst schreiben
        </TabButton>
      </div>

      {mode === "ai" && <AIEmailComposer kind={kind} onGenerated={onGenerated} />}
      {mode === "manual" && <ManualEmailComposer kind={kind} onGenerated={onGenerated} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] transition-colors ${
        active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
