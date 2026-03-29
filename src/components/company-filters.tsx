"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMPANY_LIFECYCLES, COMPANY_SIZES } from "@/lib/constants";

export function CompanyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const hasFilters =
    searchParams.has("search") ||
    searchParams.has("industry") ||
    searchParams.has("size") ||
    searchParams.has("lifecycle") ||
    searchParams.has("sortBy");

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/companies?${params.toString()}`);
    },
    [router, searchParams],
  );

  const clearFilters = useCallback(() => {
    if (searchRef.current) searchRef.current.value = "";
    router.push("/companies");
  }, [router]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
        <Input
          key={searchParams.get("search") ?? ""}
          ref={searchRef}
          placeholder="Search companies..."
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
      <Select
        value={searchParams.get("size") || "all"}
        onValueChange={(v) => updateFilter("size", v ?? "all")}
      >
        <SelectTrigger className="w-44 bg-card/50 border-border/50">
          <SelectValue>
            {searchParams.get("size")
              ? `${searchParams.get("size")} employees`
              : "All Sizes"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sizes</SelectItem>
          {COMPANY_SIZES.map((s) => (
            <SelectItem key={s} value={s}>
              {s} employees
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("lifecycle") || "all"}
        onValueChange={(v) => updateFilter("lifecycle", v ?? "all")}
      >
        <SelectTrigger className="w-44 bg-card/50 border-border/50">
          <SelectValue>
            {searchParams.get("lifecycle")
              ? (COMPANY_LIFECYCLES.find(
                  (l) => l.value === searchParams.get("lifecycle"),
                )?.label ?? "All Lifecycles")
              : "All Lifecycles"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Lifecycles</SelectItem>
          {COMPANY_LIFECYCLES.map((l) => (
            <SelectItem key={l.value} value={l.value}>
              {l.label}
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
