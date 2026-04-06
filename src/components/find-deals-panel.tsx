"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { MatchQualityBar } from "@/components/match-quality-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { findDealsForTalent } from "@/lib/actions/talent";
import { DEAL_STAGES } from "@/lib/constants";

type MatchResult = Awaited<ReturnType<typeof findDealsForTalent>>[number];

export function FindDealsPanel({ talentId }: { talentId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [results, setResults] = useState<MatchResult[]>([]);

  async function handleFind() {
    setStatus("loading");
    try {
      const data = await findDealsForTalent(talentId);
      setResults(data);
      setStatus("done");
    } catch {
      toast.error("Failed to find matching deals");
      setStatus("idle");
    }
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="neon-underline pb-1 text-base">
          Matching Deals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status === "idle" && (
          <Button
            variant="outline"
            onClick={handleFind}
            className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          >
            <Sparkles className="size-4 text-neon-400" />
            Find Matching Deals
          </Button>
        )}

        {status === "loading" && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-16 rounded" />
              </div>
            ))}
          </div>
        )}

        {status === "done" && results.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No strong deal matches found — add more notes to improve matching.
          </p>
        )}

        {status === "done" && results.length > 0 && (
          <div className="space-y-2">
            {results.map(({ deal, similarityScore, topMatchedNote }) => {
              const stageConfig = DEAL_STAGES.find(
                (s) => s.value === deal.stage,
              );
              return (
                <div
                  key={deal.id}
                  className="rounded-lg border border-border/30 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/deals/${deal.id}`}
                      className="font-medium text-sm text-foreground hover:text-neon-400 transition-colors"
                    >
                      {deal.title}
                    </Link>
                    <Badge variant="outline" className={stageConfig?.color}>
                      {stageConfig?.label ?? deal.stage}
                    </Badge>
                  </div>
                  {topMatchedNote.content && (
                    <p className="text-xs text-muted-foreground italic line-clamp-2 leading-relaxed">
                      {topMatchedNote.content.slice(0, 200)}
                    </p>
                  )}
                  <MatchQualityBar score={similarityScore} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
