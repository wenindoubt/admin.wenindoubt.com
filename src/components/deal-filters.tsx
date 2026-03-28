"use client";

import { Search, Tag, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tag as TagType } from "@/db/schema";
import { DEAL_SOURCES, DEAL_STAGES } from "@/lib/constants";

export function DealFilters({ allTags = [] }: { allTags?: TagType[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selectedTagIds = searchParams.getAll("tag");

  const hasFilters =
    searchParams.has("search") ||
    searchParams.has("stage") ||
    searchParams.has("source") ||
    searchParams.has("sortBy") ||
    searchParams.has("tag");

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/deals?${params.toString()}`);
    },
    [router, searchParams],
  );

  const toggleTag = useCallback(
    (tagId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.getAll("tag");
      params.delete("tag");

      if (current.includes(tagId)) {
        for (const id of current.filter((id) => id !== tagId)) {
          params.append("tag", id);
        }
      } else {
        for (const id of current) {
          params.append("tag", id);
        }
        params.append("tag", tagId);
      }

      router.push(`/deals?${params.toString()}`);
    },
    [router, searchParams],
  );

  const clearFilters = useCallback(() => {
    if (searchRef.current) searchRef.current.value = "";
    router.push("/deals");
  }, [router]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
        <Input
          key={searchParams.get("search") ?? ""}
          ref={searchRef}
          placeholder="Search deals..."
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => {
            clearTimeout(debounceRef.current);
            const value = e.target.value;
            debounceRef.current = setTimeout(
              () => updateFilter("search", value),
              300,
            );
          }}
          className="w-64 pl-9 bg-card/50 border-border/50 placeholder:text-muted-foreground/50 focus:border-gold-400/50 focus:ring-gold-400/20"
        />
      </div>
      <Select
        value={searchParams.get("stage") || "all"}
        onValueChange={(v) => updateFilter("stage", v ?? "all")}
      >
        <SelectTrigger className="w-44 bg-card/50 border-border/50">
          <SelectValue>
            {searchParams.get("stage")
              ? (DEAL_STAGES.find((s) => s.value === searchParams.get("stage"))
                  ?.label ?? "All Stages")
              : "All Stages"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stages</SelectItem>
          {DEAL_STAGES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("source") || "all"}
        onValueChange={(v) => updateFilter("source", v ?? "all")}
      >
        <SelectTrigger className="w-44 bg-card/50 border-border/50">
          <SelectValue>
            {searchParams.get("source")
              ? (DEAL_SOURCES.find(
                  (s) => s.value === searchParams.get("source"),
                )?.label ?? "All Sources")
              : "All Sources"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          {DEAL_SOURCES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {allTags.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selectedTagIds.length > 0
                    ? "border-gold-400/40 bg-gold-400/5 text-foreground"
                    : "border-border/50 bg-card/50 text-muted-foreground"
                }`}
              />
            }
          >
            <Tag className="size-3.5" />
            Tags
            {selectedTagIds.length > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-gold-400/20 text-[15px] font-semibold text-gold-600">
                {selectedTagIds.length}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {allTags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={selectedTagIds.includes(tag.id)}
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
      )}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
