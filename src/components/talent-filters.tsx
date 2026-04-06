"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { TierBadge } from "@/components/talent-tier-badge";
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

const TIERS = ["S", "A", "B", "C", "D"] as const;

const STATUS_OPTIONS = [
  { value: "active_inactive", label: "Active & Inactive" },
  { value: "all", label: "All" },
  { value: "archived", label: "Archived only" },
] as const;

export function TalentFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const selectedTiers = searchParams.getAll("tier");
  const statusParam = searchParams.get("status") ?? "active_inactive";

  const hasFilters =
    searchParams.has("search") ||
    searchParams.has("tier") ||
    searchParams.has("status");

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/talent?${params.toString()}`);
    },
    [router, searchParams],
  );

  const toggleTier = useCallback(
    (tier: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.getAll("tier");
      params.delete("tier");

      if (current.includes(tier)) {
        for (const t of current.filter((t) => t !== tier)) {
          params.append("tier", t);
        }
      } else {
        for (const t of current) {
          params.append("tier", t);
        }
        params.append("tier", tier);
      }

      params.delete("page");
      router.push(`/talent?${params.toString()}`);
    },
    [router, searchParams],
  );

  const clearFilters = useCallback(() => {
    if (searchRef.current) searchRef.current.value = "";
    router.push("/talent");
  }, [router]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
        <Input
          key={searchParams.get("search") ?? ""}
          ref={searchRef}
          placeholder="Search talent..."
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => {
            clearTimeout(debounceRef.current);
            const value = e.target.value;
            debounceRef.current = setTimeout(
              () => updateFilter("search", value),
              300,
            );
          }}
          className="w-64 pl-9 bg-card/50 border-border/50 placeholder:text-muted-foreground/50 focus:border-neon-400/50 focus:ring-neon-400/20"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                selectedTiers.length > 0
                  ? "border-neon-400/40 bg-neon-400/5 text-foreground"
                  : "border-border/50 bg-card/50 text-muted-foreground"
              }`}
            />
          }
        >
          Tier
          {selectedTiers.length > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-neon-400/20 text-[10px] font-semibold text-neon-600">
              {selectedTiers.length}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36">
          {TIERS.map((tier) => (
            <DropdownMenuCheckboxItem
              key={tier}
              checked={selectedTiers.includes(tier)}
              onCheckedChange={() => toggleTier(tier)}
            >
              <TierBadge tier={tier} />
              <span className="ml-1.5">Tier {tier}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Select
        value={statusParam}
        onValueChange={(v) =>
          updateFilter("status", v === "active_inactive" ? "" : (v ?? ""))
        }
      >
        <SelectTrigger className="w-44 bg-card/50 border-border/50">
          <SelectValue>
            {STATUS_OPTIONS.find((o) => o.value === statusParam)?.label ??
              "Active & Inactive"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
