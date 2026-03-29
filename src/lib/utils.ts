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

/** Strip commas from a formatted currency string */
export function stripCommas(value: string): string {
  return value.replace(/,/g, "");
}

/** Format a raw number string with commas for currency input display */
export function formatCurrencyInput(value: string): string {
  const stripped = value.replace(/[^\d.]/g, "");
  if (!stripped) return "";
  const dotIndex = stripped.indexOf(".");
  const intPart = dotIndex === -1 ? stripped : stripped.slice(0, dotIndex);
  const decPart =
    dotIndex === -1
      ? null
      : stripped
          .slice(dotIndex + 1)
          .replace(/\./g, "")
          .slice(0, 2);
  const formatted = intPart ? Number(intPart).toLocaleString("en-US") : "0";
  return decPart !== null
    ? `${formatted}.${decPart}`
    : intPart
      ? formatted
      : "";
}
