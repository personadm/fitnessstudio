"use client";

import { useState } from "react";
import { AIEmailComposer } from "./AIEmailComposer";
import { ManualEmailComposer } from "./ManualEmailComposer";
import { DocxImporter } from "./DocxImporter";

interface Props {
  kind: "funnel" | "newsletter";
  onGenerated: (subject: string, bodyHtml: string) => void;
}

type Mode = "ai" | "manual" | "import";

/**
 * Wrapper mit drei Modi für die Mail-Erstellung:
 * – KI-generiert
 * – selbst schreiben (Markdown-Stil + Bild-Upload)
 * – aus einer Pages-/Word-Datei importieren
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
        <TabButton active={mode === "import"} onClick={() => setMode("import")}>
          📄 Aus Pages-Datei
        </TabButton>
      </div>

      {mode === "ai" && <AIEmailComposer kind={kind} onGenerated={onGenerated} />}
      {mode === "manual" && <ManualEmailComposer kind={kind} onGenerated={onGenerated} />}
      {mode === "import" && <DocxImporter kind={kind} onGenerated={onGenerated} />}
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
        active
          ? "border-ink text-ink"
          : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
