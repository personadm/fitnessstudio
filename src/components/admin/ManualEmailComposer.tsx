"use client";

import { useState } from "react";
import { RichTextEditor } from "./RichTextEditor";

interface Props {
  kind: "funnel" | "newsletter";
  onGenerated: (subject: string, bodyHtml: string) => void;
}

/**
 * "Selbst schreiben"-Modus für Mails mit WYSIWYG-Editor.
 *
 * Props matchen das EmailComposer-Pattern:
 *  - `kind`: nur für Placeholder-Text (Funnel-Schritt vs Newsletter)
 *  - `onGenerated`: Callback wird bei jeder Änderung gerufen,
 *    der Parent speichert subject und bodyHtml für den späteren Submit
 */
export function ManualEmailComposer({ kind, onGenerated }: Props) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  function updateSubject(v: string) {
    setSubject(v);
    onGenerated(v, bodyHtml);
  }

  function updateBody(html: string) {
    setBodyHtml(html);
    onGenerated(subject, html);
  }

  const subjectPlaceholder =
    kind === "newsletter"
      ? "z.B. Unser neuer Sommer-Trainingsplan"
      : "z.B. Dein erster Schritt ist da";

  return (
    <div className="space-y-6">
      <div>
        <label className="label mb-2 block">Betreff</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => updateSubject(e.target.value)}
          placeholder={subjectPlaceholder}
          className="w-full border-b border-ink/20 bg-transparent py-2 text-base placeholder:text-muted/60 focus:border-ink focus:outline-none"
        />
        <p className="mt-1 font-mono text-[10px] text-muted">
          {"Tipp: {{firstName}} wird beim Versand mit dem echten Vornamen ersetzt."}
        </p>
      </div>

      <div>
        <label className="label mb-2 block">Mail-Inhalt</label>
        <RichTextEditor
          initialHtml=""
          onChange={updateBody}
          placeholder="Schreibe hier los — oder kopiere Text aus Word/Pages rein, die Formatierung bleibt erhalten."
        />
        <p className="mt-2 font-mono text-[10px] text-muted leading-relaxed">
          {"· Text aus Word/Pages: einfach Strg+V — Fett, Kursiv, Listen werden übernommen"}
          <br />
          {"· Bild einfügen: Cursor an die Stelle, dann 🖼 Bild klicken"}
          <br />
          {"· Link: Text markieren, dann 🔗 Link klicken"}
          <br />
          {"· Platzhalter: {{firstName}} wird ersetzt"}
        </p>
      </div>
    </div>
  );
}
