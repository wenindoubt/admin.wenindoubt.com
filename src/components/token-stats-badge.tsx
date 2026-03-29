import type { NoteTokenStats } from "@/lib/actions/notes";

export function TokenStatsBadge({ stats }: { stats: NoteTokenStats }) {
  if (stats.noteCount === 0) return null;

  const tokens =
    stats.totalTokens >= 1000
      ? `${(stats.totalTokens / 1000).toFixed(1)}K`
      : String(stats.totalTokens);

  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-neon-400/[0.06] px-2 py-0.5 text-[11px] font-medium text-neon-500 tabular-nums">
      {tokens} tokens &middot; {stats.noteCount} note
      {stats.noteCount !== 1 ? "s" : ""}
    </span>
  );
}
