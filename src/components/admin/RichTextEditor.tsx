"use client";

import {
  useEditor,
  EditorContent,
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type Editor,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useEffect, useRef, useState } from "react";

interface Props {
  initialHtml?: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

// ─────────────────────────────────────────────────────────────
// IMAGE-NODE mit Live-Counter
// ─────────────────────────────────────────────────────────────
//
// Counter wird via editor.on('update') aktualisiert. Bei jedem Doc-Change
// werden alle ImageNodeViews neu durchnummeriert. Das ist robust auch nach
// Insert/Delete/Reorder.

function ImageNodeView({ node, editor, getPos }: NodeViewProps) {
  const [labelNumber, setLabelNumber] = useState<number | null>(null);

  useEffect(() => {
    function recalculate() {
      if (typeof getPos !== "function") return;
      const myPos = getPos();
      if (typeof myPos !== "number") return;

      let count = 0;
      let foundIdx = 0;
      editor.state.doc.descendants((n, p) => {
        if (n.type.name === "image") {
          count++;
          if (p === myPos) foundIdx = count;
        }
      });

      setLabelNumber(foundIdx > 0 ? foundIdx : null);
    }

    recalculate();
    editor.on("update", recalculate);
    editor.on("selectionUpdate", recalculate);

    return () => {
      editor.off("update", recalculate);
      editor.off("selectionUpdate", recalculate);
    };
  }, [editor, getPos]);

  const src = (node.attrs.src as string) ?? "";
  const alt = (node.attrs.alt as string) ?? "";

  return (
    <NodeViewWrapper className="image-node-wrapper" data-bild-nr={labelNumber ?? ""}>
      <div className="image-label">
        📷 Bild {labelNumber !== null ? labelNumber : "…"}
      </div>
      <img src={src} alt={alt} draggable="false" />
    </NodeViewWrapper>
  );
}

const ImageWithLabel = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

// ─────────────────────────────────────────────────────────────
// EDITOR-KOMPONENTE
// ─────────────────────────────────────────────────────────────

export function RichTextEditor({ initialHtml = "", onChange, placeholder }: Props) {
  // KRITISCH: speichert den letzten HTML-Wert den WIR via onChange gesendet haben.
  // Damit erkennen wir, ob ein neues `initialHtml` von EXTERN kommt oder nur
  // unser eigenes Echo durch React-State-Update ist.
  const lastEmittedHtmlRef = useRef<string>(initialHtml);
  const [imageCount, setImageCount] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        horizontalRule: false,
        heading: { levels: [1, 2] },
      }),
      ImageWithLabel.configure({
        HTMLAttributes: {
          style: "max-width:100%;height:auto;display:block;",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
        },
      }),
    ],
    content: initialHtml,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedHtmlRef.current = html; // merken, was wir nach oben geben
      onChange(html);

      // Bild-Anzahl im Debug-Footer aktualisieren
      let count = 0;
      editor.state.doc.descendants((n) => {
        if (n.type.name === "image") count++;
      });
      setImageCount(count);
    },
    editorProps: {
      attributes: {
        class: "tiptap-content focus:outline-none p-4",
      },
      scrollThreshold: 80,
      scrollMargin: 80,
    },
  });

  // PING-PONG-FIX: nur setContent wenn der eingehende initialHtml weder
  // unser eigenes Echo noch der aktuelle Editor-State ist.
  useEffect(() => {
    if (!editor) return;
    if (initialHtml === lastEmittedHtmlRef.current) return; // unser eigenes Echo
    if (initialHtml === editor.getHTML()) return; // schon im Editor

    editor.commands.setContent(initialHtml || "", false);
    lastEmittedHtmlRef.current = initialHtml;
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
      <div className="max-h-[500px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      {/* Debug-Anzeige unter dem Editor — zeigt sofort wenn was nicht stimmt */}
      <div className="border-t border-ink/15 bg-ink/5 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
        {imageCount === 0 ? (
          <>Keine Bilder im Newsletter</>
        ) : (
          <>{imageCount} {imageCount === 1 ? "Bild" : "Bilder"} im Newsletter</>
        )}
      </div>
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
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-ink/15 bg-ink/5 p-2">
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

function LinkButton({ editor }: { editor: Editor }) {
  function handleLink() {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link-URL (leer = Link entfernen):", previousUrl ?? "https://");

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
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
// IMAGE-BUTTON mit robustem Insert
// ─────────────────────────────────────────────────────────────

function ImageButton({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("Bild ist zu groß (max. 4 MB). Bitte komprimieren oder kleineres Bild wählen.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      // ROBUSTER INSERT-PFAD:
      //
      // Schritt 1: Cursor IMMER ans Ende des Dokuments setzen. Damit ist
      // garantiert, dass keine NodeSelection (auf einem vorhandenen Bild)
      // aktiv ist, die durch setImage/insertContent ersetzt würde.
      //
      // Schritt 2: An aktueller Position einen leeren Paragraph + Bild +
      // leeren Paragraph einfügen. Der trailing Paragraph stellt sicher,
      // dass nach dem Bild Platz zum Tippen UND zum Einfügen weiterer
      // Bilder ist (Cursor landet nach dem Insert dort).
      editor
        .chain()
        .focus("end")
        .insertContent([
          { type: "paragraph" },
          { type: "image", attrs: { src: dataUrl } },
          { type: "paragraph" },
        ])
        .run();
    };
    reader.onerror = () => alert("Bild konnte nicht geladen werden.");
    reader.readAsDataURL(file);

    e.target.value = "";
  }

  return (
    <>
      <ToolbarButton
        onClick={() => fileRef.current?.click()}
        title="Bild ans Ende des Dokuments anfügen"
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
// EDITOR-STYLES
// ─────────────────────────────────────────────────────────────

function EditorStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.tiptap-content { font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #1A1815; min-height: 280px; }
.tiptap-content > * + * { margin-top: 0.75em; }
.tiptap-content h1 { font-size: 1.7em; font-weight: 700; line-height: 1.3; margin-top: 1em; margin-bottom: 0.4em; }
.tiptap-content h2 { font-size: 1.35em; font-weight: 700; line-height: 1.3; margin-top: 1em; margin-bottom: 0.4em; }
.tiptap-content p { margin: 0.5em 0; }
.tiptap-content p:empty::before { content: ""; display: inline-block; }
.tiptap-content strong { font-weight: 700; }
.tiptap-content em { font-style: italic; }
.tiptap-content ul, .tiptap-content ol { padding-left: 1.6em; margin: 0.6em 0; }
.tiptap-content ul { list-style: disc; }
.tiptap-content ol { list-style: decimal; }
.tiptap-content li { margin: 0.2em 0; }
.tiptap-content li > p { margin: 0; }
.tiptap-content a { color: #1A1815; text-decoration: underline; }

/* Bild-Wrapper mit Label */
.tiptap-content .image-node-wrapper {
  display: block;
  margin: 24px 0;
  padding: 0;
  text-align: center;
  position: relative;
}
.tiptap-content .image-node-wrapper .image-label {
  display: inline-block;
  background: #1A1815;
  color: #ffffff;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 4px 14px;
  margin: 0 0 8px 0;
  border-radius: 3px;
  user-select: none;
}
.tiptap-content .image-node-wrapper img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  border: 1px dashed rgba(0, 0, 0, 0.2);
  border-radius: 2px;
  background: #fafafa;
}
.tiptap-content .image-node-wrapper.ProseMirror-selectednode img {
  outline: 3px solid #7CAE2D;
  border-color: transparent;
}
.tiptap-content:focus { outline: none; }
      `,
      }}
    />
  );
}
