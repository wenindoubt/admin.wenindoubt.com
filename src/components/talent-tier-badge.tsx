import { cn } from "@/lib/utils";

const TIER_CLASSES: Record<string, string> = {
  S: "bg-neon-400/15 text-neon-600 border-neon-400/30 shadow-[0_0_8px_color-mix(in_srgb,var(--color-neon-400)_20%,transparent)]",
  A: "bg-blue-50 text-blue-700 border-blue-200",
  B: "bg-amber-50 text-amber-700 border-amber-200",
  C: "bg-orange-50 text-orange-700 border-orange-200",
  D: "bg-red-50 text-red-700 border-red-200",
};

export function TierBadge({ tier }: { tier: "S" | "A" | "B" | "C" | "D" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded border w-6 h-5 text-xs font-mono font-semibold shrink-0",
        TIER_CLASSES[tier],
      )}
    >
      {tier}
    </span>
  );
}
