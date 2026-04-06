export function MatchQualityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const label =
    score >= 0.75
      ? "Strong match"
      : score >= 0.55
        ? "Good match"
        : "Weak match";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-neon-600">
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
        <div
          className="h-full rounded-full bg-neon-400 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
