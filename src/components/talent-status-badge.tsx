import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-amber-50 text-amber-600 border-amber-200",
  archived: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

export function StatusBadge({
  status,
}: {
  status: "active" | "inactive" | "archived";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
