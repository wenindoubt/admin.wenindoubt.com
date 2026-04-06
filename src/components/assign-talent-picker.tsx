"use client";

import { UserCheck2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/talent-status-badge";
import { TierBadge } from "@/components/talent-tier-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { TalentRow } from "@/db/schema";
import { assignTalentToDeal, getTalent } from "@/lib/actions/talent";

type TalentItem = Pick<
  TalentRow,
  "id" | "firstName" | "lastName" | "tier" | "status"
>;

export function AssignTalentPicker({
  dealId,
  assignedTalentIds,
}: {
  dealId: string;
  assignedTalentIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [allTalent, setAllTalent] = useState<TalentItem[]>([]);
  const [localAssigned, setLocalAssigned] = useState(
    () => new Set(assignedTalentIds),
  );
  const [isPending, startTransition] = useTransition();
  const fetched = useRef(false);

  useEffect(() => {
    if (!open || fetched.current) return;
    getTalent({ limit: 100 }).then(({ data }) => {
      setAllTalent(
        data.map((t) => ({
          id: t.id,
          firstName: t.firstName,
          lastName: t.lastName,
          tier: t.tier,
          status: t.status,
        })),
      );
      fetched.current = true;
    });
  }, [open]);

  const filtered = allTalent.filter((t) => {
    if (localAssigned.has(t.id)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.firstName.toLowerCase().includes(q) ||
      t.lastName.toLowerCase().includes(q)
    );
  });

  function handleSelect(talentId: string) {
    setLocalAssigned((prev) => new Set([...prev, talentId]));
    startTransition(async () => {
      try {
        await assignTalentToDeal(talentId, dealId);
        toast.success("Talent assigned");
        setOpen(false);
      } catch {
        setLocalAssigned((prev) => {
          const next = new Set(prev);
          next.delete(talentId);
          return next;
        });
        toast.error("Failed to assign talent");
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
      >
        <UserCheck2 className="size-4" />
        Assign Talent
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Talent</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card/50 border-border/50"
            autoFocus
          />
          <div className="max-h-72 overflow-y-auto space-y-1 mt-1">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground px-1 py-2">
                {allTalent.length === 0
                  ? "Loading…"
                  : "No unassigned talent found"}
              </p>
            )}
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={isPending}
                onClick={() => handleSelect(t.id)}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-left hover:bg-accent/50 transition-colors disabled:opacity-50"
              >
                <TierBadge tier={t.tier} />
                <span className="flex-1 font-medium">
                  {t.firstName} {t.lastName}
                </span>
                <StatusBadge status={t.status} />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
