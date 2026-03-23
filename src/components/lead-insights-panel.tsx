"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeadInsight } from "@/db/schema";
import { Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Props = {
  leadId: string;
  insights: LeadInsight[];
};

export function LeadInsightsPanel({ leadId, insights }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [streamedText, setStreamedText] = useState("");

  async function runAnalysis() {
    setIsAnalyzing(true);
    setStreamedText("");

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
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
      window.location.reload();
    } catch {
      toast.error("Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="glow-border">
      <Card className="relative border-border/50 overflow-hidden">
        {/* Subtle gradient overlay for AI feel */}
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
              <CardDescription className="text-xs mt-1">AI-generated analysis</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="border-gold-400/25 text-gold-400 hover:bg-gold-400/10 hover:text-gold-300 hover:border-gold-400/40"
            >
              <RefreshCw className={`size-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
              {insights.length > 0 ? "Re-analyze" : "Analyze"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-4">
          {isAnalyzing && (
            <div className="space-y-2">
              {streamedText ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{streamedText}</p>
              ) : (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-gold-400/5" />
                  <Skeleton className="h-4 w-3/4 bg-gold-400/5" />
                  <Skeleton className="h-4 w-1/2 bg-gold-400/5" />
                </div>
              )}
            </div>
          )}
          {!isAnalyzing && insights.length === 0 && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-gold-400/10 mb-3">
                <Sparkles className="size-4 text-gold-400/60" />
              </div>
              <p className="text-sm text-muted-foreground">
                No analysis yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Click Analyze to generate AI insights
              </p>
            </div>
          )}
          {!isAnalyzing &&
            insights.map((insight) => (
              <div key={insight.id} className="space-y-2 border-b border-border/20 pb-4 last:border-0 last:pb-0">
                {insight.summary && (
                  <p className="text-sm font-medium text-foreground/90">{insight.summary}</p>
                )}
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {insight.analysisText}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
                  {new Date(insight.generatedAt).toLocaleString()} &middot;{" "}
                  {insight.analysisModel}
                </p>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
