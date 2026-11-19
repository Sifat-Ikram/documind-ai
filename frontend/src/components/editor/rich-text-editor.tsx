"use client";

import type { ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { FiCornerUpLeft, FiCornerUpRight } from "react-icons/fi";
import { cn } from "@/lib/cn";

function ToolButton({
  label,
  children,
  active,
  disabled,
  onClick,
}: {
  label: string;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keeps the selection inside the editor
      onClick={onClick}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm transition-colors disabled:opacity-40",
        active
          ? "bg-primary-soft text-link"
          : "text-text-muted hover:bg-surface-muted hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

const Divider = () => (
  <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
);

export function RichTextEditor({
  content,
  onChange,
  plain = false,
}: {
  content: string;
  onChange: (html: string) => void;
  /** plain text (TXT files): no formatting buttons */
  plain?: boolean;
}) {
  const editor = useEditor({
    extensions: [
      // Links and code are not kept in the saved file, so they are left out.
      StarterKit.configure({
        link: false,
        code: false,
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      TableKit,
    ],
    content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "rich-content min-h-[50vh] px-5 py-4 focus:outline-none",
        "aria-label": "Document text",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  if (!editor) {
    return (
      <div
        className="h-[50vh] animate-pulse rounded-2xl border border-border bg-surface"
        aria-busy="true"
      />
    );
  }

  const run = () => editor.chain().focus();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
        <ToolButton
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => run().undo().run()}
        >
          <FiCornerUpLeft className="size-4" />
        </ToolButton>
        <ToolButton
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => run().redo().run()}
        >
          <FiCornerUpRight className="size-4" />
        </ToolButton>

        {!plain && (
          <>
            <Divider />
            <ToolButton
              label="Bold"
              active={editor.isActive("bold")}
              onClick={() => run().toggleBold().run()}
            >
              <span className="font-bold">B</span>
            </ToolButton>
            <ToolButton
              label="Italic"
              active={editor.isActive("italic")}
              onClick={() => run().toggleItalic().run()}
            >
              <span className="italic">I</span>
            </ToolButton>
            <ToolButton
              label="Underline"
              active={editor.isActive("underline")}
              onClick={() => run().toggleUnderline().run()}
            >
              <span className="underline">U</span>
            </ToolButton>
            <ToolButton
              label="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => run().toggleStrike().run()}
            >
              <span className="line-through">S</span>
            </ToolButton>
            <Divider />
            {([1, 2, 3] as const).map((level) => (
              <ToolButton
                key={level}
                label={`Heading ${level}`}
                active={editor.isActive("heading", { level })}
                onClick={() => run().toggleHeading({ level }).run()}
              >
                H{level}
              </ToolButton>
            ))}
            <Divider />
            <ToolButton
              label="Bulleted list"
              active={editor.isActive("bulletList")}
              onClick={() => run().toggleBulletList().run()}
            >
              • List
            </ToolButton>
            <ToolButton
              label="Numbered list"
              active={editor.isActive("orderedList")}
              onClick={() => run().toggleOrderedList().run()}
            >
              1. List
            </ToolButton>
            <ToolButton
              label="Quote"
              active={editor.isActive("blockquote")}
              onClick={() => run().toggleBlockquote().run()}
            >
              Quote
            </ToolButton>
            <ToolButton
              label="Horizontal line"
              onClick={() => run().setHorizontalRule().run()}
            >
              Line
            </ToolButton>
            <Divider />
            <ToolButton
              label="Insert a table"
              onClick={() =>
                run()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
            >
              Table
            </ToolButton>
            {editor.isActive("table") && (
              <>
                <ToolButton
                  label="Add a row below"
                  onClick={() => run().addRowAfter().run()}
                >
                  + Row
                </ToolButton>
                <ToolButton
                  label="Add a column to the right"
                  onClick={() => run().addColumnAfter().run()}
                >
                  + Column
                </ToolButton>
                <ToolButton
                  label="Delete this row"
                  onClick={() => run().deleteRow().run()}
                >
                  − Row
                </ToolButton>
                <ToolButton
                  label="Delete this table"
                  onClick={() => run().deleteTable().run()}
                >
                  Delete table
                </ToolButton>
              </>
            )}
          </>
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
