"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useEffect, useRef } from "react";

interface Props {
  initialHtml?: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * WYSIWYG-Editor für Mail-Inhalte. Basiert auf TipTap.
 *
 * Features:
 *  - Paste mit Formatierung (Word, Pages, Browser) — wird automatisch übernommen
 *  - Bilder per Toolbar-Button an Cursor-Position einfügen (als Base64 inline)
 *  - Fett, Kursiv, Überschriften, Listen, Links
 *
 * Output: HTML-String via onChange-Callback bei jeder Änderung.
 *
 * Anmerkung zu Bildern: werden als data:base64-URL inline ins HTML gepackt.
 * Vorteil: kein externes Storage nötig, Bild ist Teil der Mail. Nachteil:
 * Mails werden bei mehreren großen Bildern groß (Resend-Limit liegt bei ~10 MB).
 * Pragmatischer Trade-off — bei Problemen später auf externes Hosting umsteigen.
 */
export function RichTextEditor({ initialHtml = "", onChange, placeholder }: Props) {
  const editor = useEditor({
    immediatelyRender: false, // Next.js: SSR-Mismatch vermeiden
    extensions: [
      StarterKit.configure({
        // Code-Block, Blockquote etc. brauchen wir für Mails nicht
        codeBlock: false,
        horizontalRule: false,
      }),
      Image.configure({
        // Bilder bekommen automatisch max-width:100% für Responsive
        HTMLAttributes: {
          style: "max-width:100%;height:auto;",
        },
      }),
      Link.configure({
        openOnClick: false, // Im Editor-Modus nicht navigieren
        HTMLAttributes: {
          rel: "noopener noreferrer",
        },
      }),
    ],
    content: initialHtml,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "tiptap-content focus:outline-none min-h-[300px] p-4",
      },
    },
  });

  // Wenn sich initialHtml von außen ändert (z.B. weil KI was generiert hat
  // und der Parent das in den Editor pumpt), Content aktualisieren —
  // aber NICHT bei jedem Editor-Update, sonst Endlosschleife.
  const lastInitialRef = useRef(initialHtml);
  useEffect(() => {
    if (!editor) return;
    if (initialHtml !== lastInitialRef.current) {
      lastInitialRef.current = initialHtml;
      editor.commands.setContent(initialHtml || "");
    }
  }, [initialHtml, editor]);

  if (!editor) {
    return (
      <div className="border border-ink/20 p-4 text-sm text-muted">
        Editor lädt…
      </div>
    );
  }

  return (
    <div className="border border-ink/20 bg-white">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <EditorStyles />
      {placeholder && editor.isEmpty && (
        <div className="pointer-events-none absolute mt-[-300px] p-4 text-sm text-muted/60">
          {placeholder}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TOOLBAR
// ─────────────────────────────────────────────────────────────

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-ink/15 bg-ink/5 p-2">
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Fett (Strg+B)"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Kursiv (Strg+I)"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Durchgestrichen"
      >
        <s>S</s>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Überschrift 1"
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Überschrift 2"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("paragraph")}
        onClick={() => editor.chain().focus().setParagraph().run()}
        title="Normaler Text"
      >
        ¶
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Aufzählung"
      >
        • Liste
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Nummerierte Liste"
      >
        1. Liste
      </ToolbarButton>

      <Divider />

      <LinkButton editor={editor} />
      <ImageButton editor={editor} />

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        title="Rückgängig (Strg+Z)"
        disabled={!editor.can().undo()}
      >
        ↶
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        title="Wiederherstellen (Strg+Y)"
        disabled={!editor.can().redo()}
      >
        ↷
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`min-w-[32px] px-2 py-1 font-mono text-xs border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active
          ? "bg-ink text-cream border-ink"
          : "bg-white border-ink/15 hover:border-ink/40 hover:bg-ink/5"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 inline-block h-5 w-px bg-ink/15" />;
}

// ─────────────────────────────────────────────────────────────
// LINK-BUTTON mit Inline-Dialog
// ─────────────────────────────────────────────────────────────

function LinkButton({ editor }: { editor: Editor }) {
  function handleLink() {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link-URL (leer = Link entfernen):", previousUrl ?? "https://");

    // User hat Abbrechen geklickt
    if (url === null) return;

    // Leer = entfernen
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }

  return (
    <ToolbarButton
      active={editor.isActive("link")}
      onClick={handleLink}
      title="Link einfügen / bearbeiten"
    >
      🔗 Link
    </ToolbarButton>
  );
}

// ─────────────────────────────────────────────────────────────
// IMAGE-BUTTON mit File-Picker
// ─────────────────────────────────────────────────────────────

function ImageButton({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Größen-Check: 4 MB Limit pro Bild (defensiv unter Resend-Mail-Limit)
    if (file.size > 4 * 1024 * 1024) {
      alert("Bild ist zu groß (max. 4 MB). Bitte komprimieren oder kleineres Bild wählen.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Bild an aktuelle Cursor-Position einfügen
      editor.chain().focus().setImage({ src: dataUrl }).run();
    };
    reader.onerror = () => alert("Bild konnte nicht geladen werden.");
    reader.readAsDataURL(file);

    // Input zurücksetzen damit gleiches Bild nochmal eingefügt werden kann
    e.target.value = "";
  }

  return (
    <>
      <ToolbarButton
        onClick={() => fileRef.current?.click()}
        title="Bild an Cursor-Position einfügen"
      >
        🖼 Bild
      </ToolbarButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// EDITOR-STYLES (für h1, h2, p, ul, ol etc. im Editor-Bereich)
// ─────────────────────────────────────────────────────────────

function EditorStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.tiptap-content { font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #1A1815; }
.tiptap-content > * + * { margin-top: 0.75em; }
.tiptap-content h1 { font-size: 1.7em; font-weight: 700; line-height: 1.3; margin-top: 1em; margin-bottom: 0.4em; }
.tiptap-content h2 { font-size: 1.35em; font-weight: 700; line-height: 1.3; margin-top: 1em; margin-bottom: 0.4em; }
.tiptap-content p { margin: 0.5em 0; }
.tiptap-content strong { font-weight: 700; }
.tiptap-content em { font-style: italic; }
.tiptap-content ul, .tiptap-content ol { padding-left: 1.6em; margin: 0.6em 0; }
.tiptap-content ul { list-style: disc; }
.tiptap-content ol { list-style: decimal; }
.tiptap-content li { margin: 0.2em 0; }
.tiptap-content li > p { margin: 0; }
.tiptap-content a { color: #1A1815; text-decoration: underline; }
.tiptap-content img { max-width: 100%; height: auto; display: block; margin: 16px auto; border-radius: 2px; }
.tiptap-content img.ProseMirror-selectednode { outline: 2px solid #7CAE2D; }
.tiptap-content:focus { outline: none; }
.tiptap-content .ProseMirror-trailingBreak { display: none; }
      `,
      }}
    />
  );
}
