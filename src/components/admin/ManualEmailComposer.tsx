"use client";

import { useState } from "react";
import { RichTextEditor } from "./RichTextEditor";

interface Props {
  onUpdate: (data: { subject: string; bodyHtml: string }) => void;
  initialSubject?: string;
  initialBodyHtml?: string;
}

/**
 * "Selbst schreiben"-Modus für Mails. Voller WYSIWYG-Editor:
 *  - Paste mit Formatierung aus Word/Pages/Browser
 *  - Bilder an Cursor-Position einfügen
 *  - Fett, Kursiv, Listen, Links, Überschriften
 *
 * Output via onUpdate-Callback ist HTML (direkt sendefähig).
 */
export function ManualEmailComposer({ onUpdate, initialSubject = "", initialBodyHtml = "" }: Props) {
  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState(initialBodyHtml);

  function updateSubject(v: string) {
    setSubject(v);
    onUpdate({ subject: v, bodyHtml });
  }

  function updateBody(html: string) {
    setBodyHtml(html);
    onUpdate({ subject, bodyHtml: html });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="label mb-2 block">Betreff</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => updateSubject(e.target.value)}
          placeholder="z.B. Dein erster Trainingsplan ist da"
          className="w-full border-b border-ink/20 bg-transparent py-2 text-base placeholder:text-muted/60 focus:border-ink focus:outline-none"
        />
        <p className="mt-1 font-mono text-[10px] text-muted">
          {"Tipp: {{firstName}} wird beim Versand mit dem echten Vornamen ersetzt."}
        </p>
      </div>

      <div>
        <label className="label mb-2 block">Mail-Inhalt</label>
        <RichTextEditor
          initialHtml={initialBodyHtml}
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
