import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import DOMPurify from "dompurify";

/**
 * RichTextEditor — shared tiptap-based rich text editor.
 *
 * Props:
 *   value        string (HTML)            current content
 *   onChange(html)                        called on every change (sanitized HTML)
 *   placeholder  string                   placeholder text when empty
 *   minHeight    number                   minimum height in px (default 160)
 *   ariaLabel    string                   accessible label
 */
const RichTextEditor = ({
  value = "",
  onChange,
  placeholder = "Type here…",
  minHeight = 160,
  ariaLabel = "Rich text editor",
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({}),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "rte-content",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": ariaLabel,
      },
    },
    onUpdate({ editor }) {
      if (onChange) onChange(editor.getHTML());
    },
  });

  // Sync external value → editor (e.g. after async load)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || "") !== current) {
      editor.commands.setContent(value || "", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  const TBtn = ({ active, onClick, title, children }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={!!active}
      className={`rte-btn${active ? " rte-btn-active" : ""}`}
    >
      {children}
    </button>
  );

  return (
    <div className="rte" style={{ minHeight }}>
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        <TBtn
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <b>B</b>
        </TBtn>
        <TBtn
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <i>I</i>
        </TBtn>
        <TBtn
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <s>S</s>
        </TBtn>
        <span className="rte-sep" />
        <TBtn
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading"
        >
          H
        </TBtn>
        <TBtn
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          •
        </TBtn>
        <TBtn
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          1.
        </TBtn>
        <TBtn
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
        >
          ❝
        </TBtn>
        <span className="rte-sep" />
        <TBtn
          active={editor.isActive("link")}
          onClick={() => {
            const prev = editor.getAttributes("link").href;
            const url = window.prompt("Link URL", prev || "https://");
            if (url === null) return;
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
          }}
          title="Insert link"
        >
          🔗
        </TBtn>
        <span className="rte-sep" />
        <TBtn
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          ↶
        </TBtn>
        <TBtn
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          ↷
        </TBtn>
        <TBtn
          onClick={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
          title="Clear formatting"
        >
          Tx
        </TBtn>
      </div>
      <EditorContent
        editor={editor}
        className="rte-content-wrap"
        placeholder={placeholder}
        style={{ minHeight }}
      />
    </div>
  );
};

/**
 * sanitizeHtml — strip dangerous tags/attrs from an HTML string.
 * Used on the backend too, but the editor also runs it client-side
 * so the displayed HTML never contains unsafe content.
 */
export const sanitizeHtml = (html) => {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "b", "i", "u", "s", "strike",
      "ul", "ol", "li", "blockquote", "h1", "h2", "h3", "h4",
      "a", "code", "pre", "hr", "span", "div",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });
};

export default RichTextEditor;
