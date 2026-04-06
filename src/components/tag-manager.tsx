"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tag } from "@/db/schema";
import { createTag } from "@/lib/actions/deals";

const TAG_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];

export function TagManager({
  generalTags,
  talentTags,
}: {
  generalTags: Tag[];
  talentTags: Tag[];
}) {
  const [activeScope, setActiveScope] = useState<"general" | "talent">(
    "general",
  );
  const [generalList, setGeneralList] = useState(generalTags);
  const [talentList, setTalentList] = useState(talentTags);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0]);

  const activeTags = activeScope === "general" ? generalList : talentList;

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const tag = await createTag(
        name.trim(),
        color,
        activeScope === "talent" ? "talent" : "general",
      );
      if (activeScope === "general") {
        setGeneralList((prev) => [...prev, tag]);
      } else {
        setTalentList((prev) => [...prev, tag]);
      }
      setName("");
      toast.success("Tag created");
    } catch {
      toast.error("Failed to create tag");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Scope tabs */}
      <div className="flex gap-1 border-b border-border/50">
        {(
          [
            { scope: "general", label: "Deals & Companies" },
            { scope: "talent", label: "Talent" },
          ] as const
        ).map(({ scope, label }) => (
          <button
            key={scope}
            type="button"
            onClick={() => setActiveScope(scope)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeScope === scope
                ? "border-neon-400 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Tag name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="bg-card/50 border-border/50 focus:border-neon-400/50 focus:ring-neon-400/20"
        />
        <div className="flex items-center gap-1.5">
          {TAG_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              className={`size-7 rounded-full transition-all ${
                color === c
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                  : "ring-1 ring-foreground/10 hover:ring-foreground/25"
              }`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <Button
          onClick={handleCreate}
          className="bg-neon-400 text-primary-foreground hover:bg-neon-500 border-0"
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {activeTags.map((tag) => (
          <Badge
            key={tag.id}
            className="border-0 px-3 py-1 text-sm"
            style={
              tag.color
                ? { backgroundColor: `${tag.color}20`, color: tag.color }
                : undefined
            }
          >
            {tag.name}
          </Badge>
        ))}
        {activeTags.length === 0 && (
          <p className="text-sm text-muted-foreground">No tags yet</p>
        )}
      </div>
    </div>
  );
}
