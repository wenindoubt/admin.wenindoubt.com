"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const LazyTiptapEditor = dynamic(
  () => import("@/components/tiptap-editor").then((m) => m.TiptapEditor),
  { ssr: false, loading: () => <Skeleton className="h-[120px] rounded-md" /> },
);

export const LazyMarkdownRenderer = dynamic(
  () =>
    import("@/components/markdown-renderer").then((m) => m.MarkdownRenderer),
  { ssr: false, loading: () => <Skeleton className="h-20 rounded-md" /> },
);
