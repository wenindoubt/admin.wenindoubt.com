"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createTag } from "@/lib/actions/leads";
import type { Tag } from "@/db/schema";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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

export function TagManager({ tags: initialTags }: { tags: Tag[] }) {
  const [tags, setTags] = useState(initialTags);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0]);

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const tag = await createTag(name.trim(), color);
      setTags((prev) => [...prev, tag]);
      setName("");
      toast.success("Tag created");
    } catch {
      toast.error("Failed to create tag");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Input
          placeholder="Tag name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <div className="flex gap-1">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              className={`size-8 rounded-full border-2 ${
                color === c ? "border-foreground" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <Button onClick={handleCreate}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            style={
              tag.color
                ? { backgroundColor: tag.color, color: "#fff" }
                : undefined
            }
          >
            {tag.name}
          </Badge>
        ))}
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground">No tags yet</p>
        )}
      </div>
    </div>
  );
}
