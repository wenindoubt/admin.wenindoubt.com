"use client";

import { Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Tag } from "@/db/schema";
import { setLeadTags } from "@/lib/actions/leads";

export function TagPicker({
  leadId,
  currentTags,
  allTags,
}: {
  leadId: string;
  currentTags: Tag[];
  allTags: Tag[];
}) {
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(currentTags.map((t) => t.id)),
  );
  const [isPending, startTransition] = useTransition();

  function toggleTag(tagId: string) {
    const prev = new Set(selectedIds);
    const next = new Set(selectedIds);
    if (next.has(tagId)) {
      next.delete(tagId);
    } else {
      next.add(tagId);
    }
    setSelectedIds(next);

    startTransition(async () => {
      try {
        await setLeadTags(leadId, [...next]);
      } catch {
        setSelectedIds(prev);
        toast.error("Failed to update tags");
      }
    });
  }

  const selectedTags = allTags.filter((t) => selectedIds.has(t.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selectedTags.map((tag) => (
        <Badge
          key={tag.id}
          className="border-0 gap-1 pr-1"
          style={
            tag.color
              ? { backgroundColor: `${tag.color}20`, color: tag.color }
              : undefined
          }
        >
          {tag.name}
          <button
            type="button"
            onClick={() => toggleTag(tag.id)}
            disabled={isPending}
            className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
          >
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              disabled={isPending}
              className="flex size-6 items-center justify-center rounded-full border border-dashed border-border/50 text-muted-foreground/50 hover:border-gold-400/40 hover:text-gold-400 hover:bg-gold-400/5 transition-all disabled:opacity-50"
            />
          }
        >
          <Plus className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {allTags.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No tags created yet
            </p>
          )}
          {allTags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              checked={selectedIds.has(tag.id)}
              onCheckedChange={() => toggleTag(tag.id)}
            >
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: tag.color ?? "#6b7280" }}
              />
              {tag.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
