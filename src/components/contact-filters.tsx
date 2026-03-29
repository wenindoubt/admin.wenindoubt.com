"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ContactFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const hasFilters = searchParams.has("search") || searchParams.has("sortBy");

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/contacts?${params.toString()}`);
    },
    [router, searchParams],
  );

  const clearFilters = useCallback(() => {
    if (searchRef.current) searchRef.current.value = "";
    router.push("/contacts");
  }, [router]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
        <Input
          key={searchParams.get("search") ?? ""}
          ref={searchRef}
          placeholder="Search contacts..."
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
