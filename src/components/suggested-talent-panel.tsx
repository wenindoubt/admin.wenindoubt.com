"use client";

import { ChevronRight, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { LazyMarkdownRenderer } from "@/components/lazy";
import { MatchQualityBar } from "@/components/match-quality-bar";
import { PaginationBar } from "@/components/pagination";
import { TierBadge } from "@/components/talent-tier-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TalentRow } from "@/db/schema";
import { assignTalentToDeal, findTalentForDeal } from "@/lib/actions/talent";
import { PAGE_SIZE_TALENT_MATCHES } from "@/lib/types";
import { cn, toggleSetItem } from "@/lib/utils";

// Fixed-length array for stable-height slot rendering (avoids allocating per render)
const TALENT_MATCH_SLOTS = Array.from({ length: PAGE_SIZE_TALENT_MATCHES });

type MatchResult = {
  talent: TalentRow;
  similarityScore: number;
  topMatchedNote: { content: string; title: string | null };
  isAssigned?: boolean;
};

export function SuggestedTalentPanel({ dealId }: { dealId: string }) {
  const [status, setStatus] = useState<"loading" | "done">("loading");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setResults([]);
    findTalentForDeal(dealId)
      .then((data) => {
        if (cancelled) return;
        setResults(data);
        setAssigned(
          new Set(data.filter((r) => r.isAssigned).map((r) => r.talent.id)),
        );
        setStatus("done");
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Failed to load matching talent");
        setStatus("done");
      });
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  // Collapse all notes when changing pages so height stays stable
  // biome-ignore lint/correctness/useExhaustiveDependencies: setExpanded is a stable state setter
  useEffect(() => {
    setExpanded(new Set());
  }, [page]);

  function toggleExpanded(talentId: string) {
    setExpanded((prev) => toggleSetItem(prev, talentId));
  }

  function handleAssign(talentId: string) {
    setAssigned((prev) => new Set([...prev, talentId]));
    startTransition(async () => {
      try {
        await assignTalentToDeal(talentId, dealId);
      } catch {
        setAssigned((prev) => {
          const next = new Set(prev);
          next.delete(talentId);
          return next;
        });
        toast.error("Failed to assign talent");
      }
    });
  }

  const totalPages = Math.ceil(results.length / PAGE_SIZE_TALENT_MATCHES);
  const pageResults = results.slice(
    (page - 1) * PAGE_SIZE_TALENT_MATCHES,
    page * PAGE_SIZE_TALENT_MATCHES,
  );

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="neon-underline pb-1 text-base flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-neon-400" />
          AI-Suggested Talent
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ranked by relevance to this deal's notes — add to the deal when ready
        </p>
      </CardHeader>
      <CardContent>
        {status === "loading" && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-8 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-7 w-[88px] rounded" />
              </div>
            ))}
          </div>
        )}

        {status === "done" && results.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No strong matches found. Add more notes to talent profiles to
            improve AI matching.
          </p>
        )}

        {status === "done" && results.length > 0 && (
          <>
            <div className="space-y-2">
              {/* Always render PAGE_SIZE_TALENT_MATCHES slots — invisible placeholders
                  on the last page keep the card height stable while paginating.
                  Expanded notes intentionally grow the card (user-triggered). */}
              {TALENT_MATCH_SLOTS.map((_, idx) => {
                const item = pageResults[idx];

                if (!item) {
                  return (
                    <div
                      key={`ph-${idx}`}
                      className="rounded-lg border border-transparent p-3 space-y-1.5 invisible pointer-events-none"
                      aria-hidden
                    >
                      {/* Mirror real item structure exactly for stable height */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="h-5 w-8 rounded shrink-0" />
                          <span className="text-sm">placeholder</span>
                        </div>
                        <div className="h-7 w-[88px] rounded shrink-0" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="size-3 rounded shrink-0" />
                        <div className="h-[18px] flex-1 rounded" />
                        <div className="size-3 rounded shrink-0" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between h-[18px]" />
                        <div className="h-1.5 rounded-full" />
                      </div>
                    </div>
                  );
                }

                const { talent, similarityScore, topMatchedNote } = item;
                const isNowAssigned = assigned.has(talent.id);
                const isExpanded = expanded.has(talent.id);
                const noteTitle = topMatchedNote.title ?? "Profile note";

                return (
                  <div
                    key={talent.id}
                    className="rounded-lg border border-border/30 p-3 space-y-1.5"
                  >
                    {/* Fixed-width action area prevents name column from reflowing
                          between "Add to deal" (wider) and "Added" badge (narrower) */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <TierBadge tier={talent.tier} />
                        <Link
                          href={`/talent/${talent.id}`}
                          className="font-medium text-sm text-foreground hover:text-neon-400 transition-colors truncate"
                        >
                          {talent.firstName} {talent.lastName}
                        </Link>
                      </div>
                      <div className="w-[88px] shrink-0 flex justify-end">
                        {isNowAssigned ? (
                          <Badge
                            variant="outline"
                            className="text-xs border-emerald-200 bg-emerald-50 text-emerald-700"
                          >
                            Added
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssign(talent.id)}
                            disabled={isPending}
                            className="h-7 text-xs border-border/50 w-full"
                          >
                            Add to deal
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Note title row — click to expand/collapse */}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(talent.id)}
                      className="group flex w-full items-center gap-1.5 text-left rounded px-1.5 py-1 -mx-1.5 hover:bg-muted/60 transition-colors cursor-pointer"
                    >
                      <FileText className="size-3 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground/70 truncate flex-1 transition-colors">
                        {noteTitle}
                      </span>
                      <ChevronRight
                        className={cn(
                          "size-3 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors transition-transform duration-150",
                          isExpanded && "rotate-90",
                        )}
                      />
                    </button>

                    {/* Rendered markdown — shown when expanded */}
                    {isExpanded && topMatchedNote.content && (
                      <div className="pl-[18px] pt-0.5 max-h-60 overflow-y-auto">
                        <LazyMarkdownRenderer
                          content={topMatchedNote.content}
                        />
                      </div>
                    )}

                    <MatchQualityBar score={similarityScore} />
                  </div>
                );
              })}
            </div>
            <PaginationBar
              currentPage={page}
              totalPages={totalPages}
              total={results.length}
              pageSize={PAGE_SIZE_TALENT_MATCHES}
              onPageChange={setPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
