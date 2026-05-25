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
import { useEffect, useRef } from "react";

interface Props {
  initialHtml?: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

// ─────────────────────────────────────────────────────────────
// IMAGE-NODE mit Label im Editor
// ─────────────────────────────────────────────────────────────
//
// Wichtige Fixes gegenüber der vorherigen Version:
//
// 1) NodeViewWrapper OHNE `as="span"`. TipTap-Image ist ein block-level Node
//    (group: 'block'). Mit `as="span"` (inline) wurde ProseMirror beim
//    Einfügen des zweiten Bildes verwirrt — das erste Bild wurde mit dem
//    neuen ersetzt statt ein zweites zu erzeugen.
//
// 2) Counter-Logik via positions[]-Array statt frühem return. Sammelt erst
//    alle Image-Positionen und nutzt indexOf — robuster als ein bedingter
//    return in der descendants-Callback.

function ImageNodeView({ node, editor, getPos }: NodeViewProps) {
  // Aktuelle Position dieses Nodes im Dokument
  const myPos =
    typeof getPos === "function" ? getPos() : undefined;

  // Alle Image-Positionen im Dokument sammeln
  const allImagePositions: number[] = [];
  editor.state.doc.descendants((n, p) => {
    if (n.type.name === "image") {
      allImagePositions.push(p);
    }
  });

  // Index 1-basiert ermitteln; fallback "?" falls Position nicht gefunden
  let labelNumber: string | number = "?";
  if (typeof myPos === "number") {
    const idx = allImagePositions.indexOf(myPos);
    if (idx !== -1) labelNumber = idx + 1;
  }

  const src = (node.attrs.src as string) ?? "";
  const alt = (node.attrs.alt as string) ?? "";

  return (
    <NodeViewWrapper className="image-node-wrapper">
      <div className="image-label">Bild {labelNumber}</div>
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
          style: "max-width:100%;height:auto;",
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
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "tiptap-content focus:outline-none p-4",
      },
      scrollThreshold: 80,
      scrollMargin: 80,
    },
  });

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
      <div className="max-h-[500px] overflow-y-auto">
        <EditorContent editor={editor} />
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

      // Wichtig: setImage() ersetzt die aktuelle Selection — wenn der Cursor
      // direkt nach dem letzten eingefügten Bild auf dem Bild stand, würde
      // dieses ersetzt. Stattdessen:
      //  1) Cursor IMMER ans Ende des Dokuments setzen
      //  2) Einen neuen Paragraph anfügen
      //  3) In den neuen Paragraph das Bild einfügen
      //  4) Cursor hinter das Bild verschieben (für nächstes Bild)
      const endPos = editor.state.doc.content.size;
      editor
        .chain()
        .focus()
        .insertContentAt(endPos, [
          { type: "paragraph" },
          { type: "image", attrs: { src: dataUrl } },
          { type: "paragraph" },
        ])
        .run();

      // Cursor in den letzten leeren Paragraph nach dem Bild
      const newEnd = editor.state.doc.content.size;
      editor.commands.setTextSelection(newEnd - 1);
    };
    reader.onerror = () => alert("Bild konnte nicht geladen werden.");
    reader.readAsDataURL(file);

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

/* Bild-Wrapper mit Label — Label ist BLOCK-LEVEL über dem Bild,
   nicht absolut positioniert (sonst überdeckt es das Bild). */
.tiptap-content .image-node-wrapper {
  display: block;
  margin: 20px 0;
  text-align: center;
}
.tiptap-content .image-node-wrapper .image-label {
  display: inline-block;
  background: #1A1815;
  color: #fff;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  padding: 3px 12px;
  margin-bottom: 6px;
  border-radius: 2px;
  user-select: none;
}
.tiptap-content .image-node-wrapper img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  border: 1px dashed rgba(0, 0, 0, 0.15);
  border-radius: 2px;
}
.tiptap-content .image-node-wrapper.ProseMirror-selectednode img {
  outline: 2px solid #7CAE2D;
  border-color: transparent;
}
.tiptap-content:focus { outline: none; }
      `,
      }}
    />
  );
}
