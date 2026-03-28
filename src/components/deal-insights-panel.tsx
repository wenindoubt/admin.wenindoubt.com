"use client";

import {
  AlertTriangle,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Clock,
  Download,
  FileText,
  MessageSquare,
  Printer,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Company, Contact, Deal, DealInsight } from "@/db/schema";
import { deleteInsight } from "@/lib/actions/ai";
import { buildDealContext } from "@/lib/ai/context";

type Props = {
  deal: Deal;
  company: Company;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    jobTitle: string | null;
  } | null;
  insights: DealInsight[];
};

const PAGE_SIZE = 3;

// Markdown component overrides for the analysis prose
const mdComponents: Components = {
  h1: ({ children }) => (
    <h2 className="font-heading text-xl font-bold tracking-tight text-foreground mt-6 mb-3 first:mt-0">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground mt-5 mb-2 first:mt-0 border-b border-gold-400/20 pb-1.5">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="text-sm font-semibold uppercase tracking-wider text-gold-600 mt-4 mb-1.5">
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
    <ul className="mb-3 space-y-1.5 text-sm text-foreground/80 list-none pl-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 space-y-1.5 text-sm text-foreground/80 list-decimal pl-5">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[0.6em] before:size-1.5 before:rounded-full before:bg-gold-400/40">
      {children}
    </li>
  ),
  hr: () => (
    <hr className="my-4 border-0 h-px bg-gradient-to-r from-transparent via-gold-400/25 to-transparent" />
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto rounded-lg border border-border/40">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-gold-400/20 bg-gold-400/[0.04]">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gold-600">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-foreground/75 border-t border-border/20">
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-gold-400/40 pl-4 italic text-foreground/60">
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

function AnalysisContent({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={mdComponents}>
      {text}
    </ReactMarkdown>
  );
}

const PRINT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #1a1a2e; padding: 48px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
  h2, h3 { font-family: 'DM Serif Display', serif; }
  h2 { font-size: 30px; margin-top: 28px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #c9a84c; }
  h3 { font-size: 24px; margin-top: 20px; margin-bottom: 8px; }
  h4 { font-size: 18px; font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.08em; color: #8a7230; margin-top: 18px; margin-bottom: 6px; }
  p { font-size: 20px; margin-bottom: 10px; color: #333; }
  strong { color: #1a1a2e; }
  ul { list-style: none; padding-left: 0; margin-bottom: 12px; }
  ul li { padding-left: 16px; position: relative; margin-bottom: 4px; font-size: 20px; color: #333; }
  ul li::before { content: ''; position: absolute; left: 0; top: 8px; width: 5px; height: 5px; border-radius: 50%; background: #c9a84c; }
  ol { padding-left: 20px; margin-bottom: 12px; }
  ol li { margin-bottom: 4px; font-size: 20px; color: #333; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 18px; }
  thead { background: #f8f4eb; }
  th { text-align: left; padding: 6px 10px; border-bottom: 2px solid #c9a84c; font-size: 15px; text-transform: uppercase; letter-spacing: 0.08em; color: #8a7230; }
  td { padding: 6px 10px; border-bottom: 1px solid #eee; color: #444; }
  hr { border: 0; height: 1px; background: #c9a84c; opacity: 0.3; margin: 20px 0; }
  blockquote { border-left: 3px solid #c9a84c; padding-left: 16px; font-style: italic; color: #666; margin-bottom: 12px; }
  @media print { body { padding: 0; } }
`;

function ExportToolbar({
  analysisText,
  contentRef,
  dealTitle,
}: {
  analysisText: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
  dealTitle?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyMarkdown = useCallback(async () => {
    await navigator.clipboard.writeText(analysisText);
    setCopied(true);
    toast.success("Markdown copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [analysisText]);

  const downloadMarkdown = useCallback(() => {
    const blob = new Blob([analysisText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis${dealTitle ? `-${dealTitle.toLowerCase().replace(/\s+/g, "-")}` : ""}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analysisText, dealTitle]);

  const printAnalysis = useCallback(() => {
    const renderedHtml = contentRef.current?.innerHTML;
    if (!renderedHtml) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked — allow popups to print");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(
      `<!DOCTYPE html><html><head><title>Deal Analysis${dealTitle ? ` — ${dealTitle}` : ""}</title><style>${PRINT_STYLES}</style></head><body>${renderedHtml}</body></html>`,
    );
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
  }, [contentRef, dealTitle]);

  const btnClass =
    "h-7 gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors";

  return (
    <div className="flex items-center gap-1 border-t border-border/30 pt-3 mt-1">
      <span className="text-[15px] uppercase tracking-wider text-muted-foreground/40 mr-2">
        Export
      </span>
      <Button
        variant="ghost"
        size="sm"
        className={btnClass}
        onClick={copyMarkdown}
      >
        {copied ? (
          <Check className="size-3 text-emerald-500" />
        ) : (
          <ClipboardCopy className="size-3" />
        )}
        {copied ? "Copied" : "Copy MD"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={btnClass}
        onClick={downloadMarkdown}
      >
        <Download className="size-3" />
        Download .md
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={btnClass}
        onClick={printAnalysis}
      >
        <Printer className="size-3" />
        Print / PDF
      </Button>
    </div>
  );
}

function PromptBadge({ prompt }: { prompt: string }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-md bg-gold-400/[0.04] border border-gold-400/15 px-3 py-2">
      <MessageSquare className="size-3.5 text-gold-500 mt-0.5 shrink-0" />
      <p className="text-sm italic text-foreground/70 leading-relaxed">
        {prompt}
      </p>
    </div>
  );
}

function HistoryInsightCard({
  insight,
  dealId,
  onDelete,
}: {
  insight: DealInsight;
  dealId: string;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isCustom = !!insight.prompt;

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    startTransition(async () => {
      try {
        await deleteInsight(insight.id, dealId);
        toast.success("Analysis deleted");
        onDelete();
      } catch {
        toast.error("Failed to delete");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border/30 bg-card p-5 transition-all hover:border-border/50">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex size-6 items-center justify-center rounded-md ${isCustom ? "bg-violet-500/10" : "bg-gold-400/10"}`}
          >
            {isCustom ? (
              <MessageSquare className="size-3 text-violet-500" />
            ) : (
              <Sparkles className="size-3 text-gold-400" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-foreground/70">
              {isCustom ? "Custom Query" : "Full Analysis"}
            </p>
            <p className="text-[15px] text-muted-foreground/50">
              {new Date(insight.generatedAt).toLocaleString()} &middot;{" "}
              {insight.analysisModel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${
            confirmDelete
              ? "border-red-500/40 bg-red-500/10 text-red-600 hover:bg-red-500/20"
              : "border-red-300/30 text-red-400/70 hover:border-red-400/50 hover:text-red-500 hover:bg-red-500/5"
          }`}
        >
          <Trash2 className="size-3.5" />
          {isPending
            ? "Deleting..."
            : confirmDelete
              ? "Confirm delete?"
              : "Delete"}
        </button>
      </div>

      {/* Prompt badge if custom */}
      {insight.prompt && <PromptBadge prompt={insight.prompt} />}

      {/* Analysis content */}
      <div ref={ref} className="analysis-prose">
        <AnalysisContent text={insight.analysisText} />
      </div>

      {/* Export */}
      <ExportToolbar analysisText={insight.analysisText} contentRef={ref} />
    </div>
  );
}

function InsightHistoryModal({
  dealId,
  olderInsights,
}: {
  dealId: string;
  olderInsights: DealInsight[];
}) {
  const [historyPage, setHistoryPage] = useState(0);

  const totalPages = Math.ceil(olderInsights.length / PAGE_SIZE);
  const pagedInsights = olderInsights.slice(
    historyPage * PAGE_SIZE,
    (historyPage + 1) * PAGE_SIZE,
  );

  function handleDelete() {
    if (pagedInsights.length <= 1 && historyPage > 0) {
      setHistoryPage(historyPage - 1);
    }
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 rounded-lg border border-border/30 text-xs font-medium text-muted-foreground/60 hover:text-foreground hover:border-gold-400/30 hover:bg-gold-400/[0.03] transition-all"
          />
        }
      >
        <Clock className="size-3.5" />
        View {olderInsights.length} previous{" "}
        {olderInsights.length === 1 ? "analysis" : "analyses"}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
        showCloseButton
      >
        {/* Modal header */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gold-400/10">
              <Clock className="size-3.5 text-gold-400" />
            </div>
            Analysis History
          </DialogTitle>
          <DialogDescription>
            {olderInsights.length}{" "}
            {olderInsights.length === 1 ? "analysis" : "analyses"} &middot;
            Showing {historyPage * PAGE_SIZE + 1}–
            {Math.min((historyPage + 1) * PAGE_SIZE, olderInsights.length)} of{" "}
            {olderInsights.length}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-4 min-h-0">
          {pagedInsights.map((insight) => (
            <HistoryInsightCard
              key={insight.id}
              insight={insight}
              dealId={dealId}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border/20 -mx-4 px-4">
            <p className="text-xs text-muted-foreground/50">
              Page {historyPage + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setHistoryPage(Math.max(0, historyPage - 1))}
                disabled={historyPage === 0}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={`page-${i}`}
                  type="button"
                  onClick={() => setHistoryPage(i)}
                  className={`flex size-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                    i === historyPage
                      ? "bg-gold-400/15 text-gold-500"
                      : "text-muted-foreground/50 hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setHistoryPage(Math.min(totalPages - 1, historyPage + 1))
                }
                disabled={historyPage >= totalPages - 1}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function DealInsightsPanel({ deal, company, contact, insights }: Props) {
  const dealId = deal.id;
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState("");
  const [dismissedStale, setDismissedStale] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const latestInsight = insights[0];
  const olderInsights = insights.slice(1);

  // Build contact in the shape buildDealContext expects
  const contactForContext: Contact | null = contact
    ? {
        id: contact.id,
        companyId: deal.companyId,
        firstName: contact.firstName ?? "",
        lastName: contact.lastName ?? "",
        email: contact.email,
        phone: contact.phone,
        linkedinUrl: null,
        jobTitle: contact.jobTitle,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    : null;

  // Detect which fields changed since last analysis
  const currentContext = buildDealContext(deal, company, contactForContext);
  const staleChanges = (() => {
    if (dismissedStale) return [];
    if (!latestInsight?.rawInput) return [];
    if (latestInsight.rawInput === currentContext) return [];

    const parseFields = (text: string) => {
      const map = new Map<string, string>();
      for (const line of text.split("\n")) {
        if (line.startsWith("Recent Activity")) break;
        const idx = line.indexOf(": ");
        if (idx > 0) map.set(line.slice(0, idx), line.slice(idx + 2));
      }
      return map;
    };

    const oldFields = parseFields(latestInsight.rawInput);
    const newFields = parseFields(currentContext);
    const changes: { field: string; from: string; to: string }[] = [];

    for (const [key, newVal] of newFields) {
      const oldVal = oldFields.get(key);
      if (oldVal !== newVal) {
        changes.push({ field: key, from: oldVal ?? "(empty)", to: newVal });
      }
    }
    for (const [key, oldVal] of oldFields) {
      if (!newFields.has(key)) {
        changes.push({ field: key, from: oldVal, to: "(removed)" });
      }
    }
    return changes;
  })();
  const isStale = staleChanges.length > 0;

  async function runAnalysis(prompt?: string) {
    setIsAnalyzing(true);
    setStreamedText("");
    setActivePrompt(prompt ?? null);

    try {
      const body: Record<string, string> = { dealId };
      if (prompt) body.prompt = prompt;

      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Analysis failed");
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setStreamedText((prev) => prev + chunk);
      }

      toast.success("Analysis complete");
      router.refresh();
    } catch {
      toast.error("Analysis failed");
    } finally {
      setIsAnalyzing(false);
      setActivePrompt(null);
    }
  }

  // Auto-trigger analysis for new deals with no insights.
  const hasRunAutoAnalysis = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: ref-guarded one-shot effect
  useEffect(() => {
    if (insights.length === 0 && !hasRunAutoAnalysis.current) {
      hasRunAutoAnalysis.current = true;
      runAnalysis();
    }
  }, [insights.length]);

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = customQuery.trim();
    if (!q) return;
    setCustomQuery("");
    runAnalysis(q);
  }

  return (
    <div className="glow-border">
      <Card className="relative border-border/50 overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gold-400/[0.02] via-transparent to-violet-500/[0.02] pointer-events-none" />

        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex size-5 items-center justify-center rounded-md bg-gold-400/15">
                  <Sparkles className="size-3 text-gold-400" />
                </div>
                AI Insights
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {latestInsight
                  ? `Last analyzed ${new Date(latestInsight.generatedAt).toLocaleDateString()} · ${latestInsight.analysisModel}`
                  : "AI-generated analysis"}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => runAnalysis()}
              disabled={isAnalyzing}
              className="border-gold-400/25 text-gold-400 hover:bg-gold-400/10 hover:text-gold-300 hover:border-gold-400/40"
            >
              <RefreshCw
                className={`size-3.5 ${isAnalyzing ? "animate-spin" : ""}`}
              />
              {insights.length > 0 ? "Re-analyze" : "Analyze"}
            </Button>
          </div>

          {/* Custom query input */}
          <form onSubmit={handleCustomSubmit} className="mt-3 relative">
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              disabled={isAnalyzing}
              maxLength={500}
              placeholder="Ask something specific about this deal..."
              className="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-gold-400/30 focus:border-gold-400/30 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isAnalyzing || !customQuery.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-md bg-gold-400/15 text-gold-500 hover:bg-gold-400/25 transition-colors disabled:opacity-30 disabled:hover:bg-gold-400/15"
            >
              <ArrowUp className="size-3.5" />
            </button>
          </form>
        </CardHeader>

        <CardContent className="relative">
          {/* Stale analysis banner */}
          {isStale && !isAnalyzing && (
            <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-sm">
                  <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                  <span className="text-foreground/80">
                    Deal data changed since last analysis
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runAnalysis()}
                    className="h-7 border-amber-400/30 text-amber-600 hover:bg-amber-400/10 hover:text-amber-500 hover:border-amber-400/50 text-xs"
                  >
                    <RefreshCw className="size-3" />
                    Re-analyze
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDismissedStale(true)}
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                {staleChanges.map((c) => (
                  <div
                    key={c.field}
                    className="flex items-baseline gap-1.5 text-foreground/60"
                  >
                    <span className="font-medium text-amber-600/80">
                      {c.field}:
                    </span>
                    <span className="line-through text-muted-foreground/40">
                      {c.from}
                    </span>
                    <span className="text-foreground/70">&rarr;</span>
                    <span className="text-foreground/80">{c.to}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Streaming state */}
          {isAnalyzing && (
            <div>
              {activePrompt && <PromptBadge prompt={activePrompt} />}
              {streamedText ? (
                <div ref={contentRef} className="analysis-prose">
                  <AnalysisContent text={streamedText} />
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48 bg-gold-400/5" />
                    <Skeleton className="h-4 w-full bg-gold-400/5" />
                    <Skeleton className="h-4 w-5/6 bg-gold-400/5" />
                    <Skeleton className="h-4 w-3/4 bg-gold-400/5" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40 bg-gold-400/5" />
                    <Skeleton className="h-4 w-full bg-gold-400/5" />
                    <Skeleton className="h-4 w-4/5 bg-gold-400/5" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!isAnalyzing && insights.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-gold-400/10 mb-3">
                <FileText className="size-5 text-gold-400/60" />
              </div>
              <p className="text-sm font-medium text-foreground/70">
                No analysis yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
                Run an analysis to get AI-powered insights, or ask a specific
                question about this deal
              </p>
            </div>
          )}

          {/* Latest insight */}
          {!isAnalyzing && latestInsight && (
            <div>
              <div ref={contentRef}>
                {latestInsight.prompt && (
                  <PromptBadge prompt={latestInsight.prompt} />
                )}
                <div className="analysis-prose">
                  <AnalysisContent text={latestInsight.analysisText} />
                </div>
              </div>

              <ExportToolbar
                analysisText={latestInsight.analysisText}
                contentRef={contentRef}
                dealTitle={deal.title}
              />

              {/* History modal trigger */}
              {olderInsights.length > 0 && (
                <InsightHistoryModal
                  dealId={dealId}
                  olderInsights={olderInsights}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
