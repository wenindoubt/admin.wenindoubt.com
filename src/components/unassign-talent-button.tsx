"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { unassignTalentFromDeal } from "@/lib/actions/talent";

export function UnassignTalentButton({
  talentId,
  dealId,
  className,
}: {
  talentId: string;
  dealId: string;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleUnassign() {
    startTransition(async () => {
      try {
        await unassignTalentFromDeal(talentId, dealId);
        toast.success("Unassigned");
      } catch {
        toast.error("Failed to unassign");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={handleUnassign}
      className={`text-muted-foreground hover:text-destructive hover:bg-destructive/5 text-xs h-7${className ? ` ${className}` : ""}`}
    >
      {isPending ? "Removing..." : "Unassign"}
    </Button>
  );
}
