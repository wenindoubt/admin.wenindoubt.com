"use client";

import dynamic from "next/dynamic";
import { InsightsPanelSkeleton } from "@/components/skeletons/insights-panel-skeleton";
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

export const LazyDealInsightsPanel = dynamic(
  () =>
    import("@/components/deal-insights-panel").then((m) => m.DealInsightsPanel),
  { ssr: false, loading: () => <InsightsPanelSkeleton /> },
);
