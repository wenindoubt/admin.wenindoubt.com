"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Keep in sync with .tiptap-content styles in globals.css
const mdComponents: Components = {
  h1: ({ children }) => (
    <h2 className="font-heading text-xl font-bold tracking-tight text-foreground mt-6 mb-3 first:mt-0">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground mt-5 mb-2 first:mt-0 border-b border-neon-400/20 pb-1.5">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="text-sm font-semibold uppercase tracking-wider text-neon-600 mt-4 mb-1.5">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-sm leading-relaxed text-foreground/80 mb-3 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 text-sm text-foreground/80 list-disc pl-5">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 text-sm text-foreground/80 list-decimal pl-5">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  hr: () => (
    <hr className="my-4 border-0 h-px bg-gradient-to-r from-transparent via-neon-400/25 to-transparent" />
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto rounded-lg border border-border/40">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-neon-400/20 bg-neon-400/[0.04]">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neon-600">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-foreground/75 border-t border-border/20">
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-neon-400/40 pl-4 italic text-foreground/60">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground/80">
      {children}
    </code>
  ),
};

const remarkPlugins = [remarkGfm];

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={mdComponents}>
      {content}
    </ReactMarkdown>
  );
}
