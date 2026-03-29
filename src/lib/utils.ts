import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: string | number): string {
  return `$${Number(value).toLocaleString()}`;
}

/** Sanitize user input into a Postgres tsquery prefix-match string. Returns null if no valid tokens. */
export function buildTsquery(input: string): string | null {
  const tsquery = input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[&|!():*\\'"]/g, ""))
    .filter(Boolean)
    .map((t) => `${t}:*`)
    .join(" & ");
  return tsquery || null;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const FORM_INPUT_CLASSES =
  "bg-card/50 border-border/50 focus:border-neon-400/50 focus:ring-neon-400/20";

export const FORM_LABEL_CLASSES =
  "text-xs uppercase tracking-wider text-muted-foreground/80";
