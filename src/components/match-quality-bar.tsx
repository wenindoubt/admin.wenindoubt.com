export function MatchQualityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const { fill, label } =
    score >= 0.75
      ? { fill: "bg-emerald-500", label: "Strong match" }
      : score >= 0.55
        ? { fill: "bg-amber-500", label: "Good match" }
        : { fill: "bg-orange-500", label: "Weak match" };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-border/30 overflow-hidden">
        <div
          className={`h-1 rounded-full ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground/60 tabular-nums">
        {pct}%
      </span>
      <span className="text-[10px] text-muted-foreground/50">{label}</span>
    </div>
  );
}
