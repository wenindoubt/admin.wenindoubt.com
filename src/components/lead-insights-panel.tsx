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
      // Reload page to show saved insight
      window.location.reload();
    } catch {
      toast.error("Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" />
              AI Insights
            </CardTitle>
            <CardDescription>AI-generated analysis</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runAnalysis}
            disabled={isAnalyzing}
          >
            <RefreshCw className={`size-4 ${isAnalyzing ? "animate-spin" : ""}`} />
            {insights.length > 0 ? "Re-analyze" : "Analyze"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAnalyzing && (
          <div className="space-y-2">
            {streamedText ? (
              <p className="whitespace-pre-wrap text-sm">{streamedText}</p>
            ) : (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </>
            )}
          </div>
        )}
        {!isAnalyzing && insights.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No analysis yet. Click Analyze to generate AI insights.
          </p>
        )}
        {!isAnalyzing &&
          insights.map((insight) => (
            <div key={insight.id} className="space-y-2">
              {insight.summary && (
                <p className="text-sm font-medium">{insight.summary}</p>
              )}
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {insight.analysisText}
              </p>
              <p className="text-xs text-muted-foreground">
                Generated {new Date(insight.generatedAt).toLocaleString()} via{" "}
                {insight.analysisModel}
              </p>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
