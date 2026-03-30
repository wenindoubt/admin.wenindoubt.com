"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Code, Italic, List, ListOrdered } from "lucide-react";
import { useCallback, useEffect } from "react";
import { Markdown } from "tiptap-markdown";

type MarkdownStorage = { markdown: { getMarkdown: () => string } };

type Props = {
  content?: string;
  onChange?: (markdown: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function TiptapEditor({
  content = "",
  onChange,
  placeholder = "Write something...",
  disabled = false,
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor: e }) => {
      const md = (e.storage as unknown as MarkdownStorage).markdown;
      onChange?.(md.getMarkdown());
    },
    editorProps: {
      attributes: {
        class:
          "tiptap-content min-h-[120px] max-w-none px-3 py-2 text-sm focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor && disabled !== !editor.isEditable) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  const setContent = useCallback(
    (md: string) => {
      if (!editor) return;
      editor.commands.setContent(md);
    },
    [editor],
  );

  // Sync content prop changes (e.g., edit mode, form reset)
  // biome-ignore lint/correctness/useExhaustiveDependencies: only sync on content prop change
  useEffect(() => {
    const md = (editor?.storage as unknown as MarkdownStorage)?.markdown;
    if (editor && md && content !== md.getMarkdown()) {
      setContent(content);
    }
  }, [content]);

  if (!editor) return null;

  return (
    <div className="rounded-md border border-border/50 bg-card/50 focus-within:border-neon-400/50 focus-within:ring-1 focus-within:ring-neon-400/20 transition-colors">
      <Toolbar editor={editor} disabled={disabled} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({
  editor,
  disabled,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>;
  disabled: boolean;
}) {
  const activeStates = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            bulletList: e.isActive("bulletList"),
            orderedList: e.isActive("orderedList"),
            codeBlock: e.isActive("codeBlock"),
          }
        : null,
  });

  if (!activeStates) return null;

  const buttons = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: activeStates.bold,
      label: "Bold",
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: activeStates.italic,
      label: "Italic",
    },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: activeStates.bulletList,
      label: "Bullet list",
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: activeStates.orderedList,
      label: "Numbered list",
    },
    {
      icon: Code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      active: activeStates.codeBlock,
      label: "Code",
    },
  ];

  return (
    <div className="flex items-center gap-0.5 border-b border-border/30 px-1.5 py-1">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          type="button"
          onClick={btn.action}
          disabled={disabled}
          title={btn.label}
          className={`flex size-7 items-center justify-center rounded-md transition-colors ${
            btn.active
              ? "bg-neon-400/15 text-neon-500"
              : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/60"
          } disabled:opacity-40`}
        >
          <btn.icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
