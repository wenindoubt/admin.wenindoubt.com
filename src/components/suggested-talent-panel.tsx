"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MatchQualityBar } from "@/components/match-quality-bar";
import { TierBadge } from "@/components/talent-tier-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TalentRow } from "@/db/schema";
import {
  assignTalentToDeal,
  findTalentForDeal,
  findTalentForEntity,
} from "@/lib/actions/talent";

type MatchResult = {
  talent: TalentRow;
  similarityScore: number;
  topMatchedNote: { content: string; title: string | null };
  isAssigned?: boolean;
};

type Props =
  | { dealId: string; entityType?: never; entityId?: never }
  | { dealId?: never; entityType: "company" | "contact"; entityId: string };

export function SuggestedTalentPanel(props: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  async function handleFind() {
    setStatus("loading");
    try {
      let data: MatchResult[];
      if (props.dealId) {
        data = await findTalentForDeal(props.dealId);
        setAssigned(
          new Set(data.filter((r) => r.isAssigned).map((r) => r.talent.id)),
        );
      } else if (props.entityType && props.entityId) {
        data = await findTalentForEntity(props.entityType, props.entityId);
      } else {
        data = [];
      }
      setResults(data);
      setStatus("done");
    } catch {
      toast.error("Failed to find matching talent");
      setStatus("idle");
    }
  }

  function handleAssign(talentId: string) {
    if (!props.dealId) return;
    const dealId = props.dealId;
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

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="neon-underline pb-1 text-base">
          Matching Talent
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
            Find Matching Talent
          </Button>
        )}

        {status === "loading" && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-8 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-7 w-16 rounded" />
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
          <div className="space-y-2">
            {results.map(({ talent, similarityScore, topMatchedNote }) => {
              const isNowAssigned = assigned.has(talent.id);
              return (
                <div
                  key={talent.id}
                  className="rounded-lg border border-border/30 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <TierBadge tier={talent.tier} />
                      <Link
                        href={`/talent/${talent.id}`}
                        className="font-medium text-sm text-foreground hover:text-neon-400 transition-colors"
                      >
                        {talent.firstName} {talent.lastName}
                      </Link>
                    </div>
                    {props.dealId &&
                      (isNowAssigned ? (
                        <Badge
                          variant="outline"
                          className="text-xs border-emerald-200 bg-emerald-50 text-emerald-700"
                        >
                          Assigned
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAssign(talent.id)}
                          disabled={isPending}
                          className="h-7 text-xs border-border/50"
                        >
                          Assign
                        </Button>
                      ))}
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
