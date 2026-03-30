import { describe, expect, it } from "vitest";
import {
  buildTsquery,
  cn,
  formatCurrency,
  formatCurrencyInput,
  formatDate,
  formatDateTime,
  formatFileSize,
  stripCommas,
} from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("deduplicates conflicting Tailwind classes", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });
});

describe("buildTsquery", () => {
  it("returns null for empty string", () => {
    expect(buildTsquery("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(buildTsquery("   ")).toBeNull();
  });

  it("returns prefix match for single word", () => {
    expect(buildTsquery("hello")).toBe("hello:*");
  });

  it("joins multiple words with &", () => {
    expect(buildTsquery("hello world")).toBe("hello:* & world:*");
  });

  it("strips special Postgres tsquery characters", () => {
    expect(buildTsquery("hello & world")).toBe("hello:* & world:*");
    expect(buildTsquery("test|value")).toBe("testvalue:*");
    expect(buildTsquery("it's")).toBe("its:*");
  });

  it("returns null when input is only special characters", () => {
    expect(buildTsquery("& | ! ()")).toBeNull();
  });

  it("handles mixed valid and invalid tokens", () => {
    expect(buildTsquery("valid *** also")).toBe("valid:* & also:*");
  });
});

describe("formatCurrency", () => {
  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formats integer with commas", () => {
    expect(formatCurrency(1234)).toBe("$1,234");
  });

  it("formats large number", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000");
  });

  it("accepts string input", () => {
    expect(formatCurrency("50000")).toBe("$50,000");
  });
});

describe("stripCommas", () => {
  it("removes commas from formatted string", () => {
    expect(stripCommas("1,234,567")).toBe("1234567");
  });

  it("returns unchanged string without commas", () => {
    expect(stripCommas("1234")).toBe("1234");
  });

  it("handles empty string", () => {
    expect(stripCommas("")).toBe("");
  });
});

describe("formatCurrencyInput", () => {
  it("returns empty for empty input", () => {
    expect(formatCurrencyInput("")).toBe("");
  });

  it("returns empty for non-numeric input", () => {
    expect(formatCurrencyInput("abc")).toBe("");
  });

  it("formats integer with commas", () => {
    expect(formatCurrencyInput("1234")).toBe("1,234");
  });

  it("formats large integer", () => {
    expect(formatCurrencyInput("1234567")).toBe("1,234,567");
  });

  it("preserves decimal with up to 2 places", () => {
    expect(formatCurrencyInput("1234.5")).toBe("1,234.5");
    expect(formatCurrencyInput("1234.56")).toBe("1,234.56");
  });

  it("truncates decimals beyond 2 places", () => {
    expect(formatCurrencyInput("1234.567")).toBe("1,234.56");
  });

  it("handles leading dot", () => {
    expect(formatCurrencyInput(".5")).toBe("0.5");
  });

  it("preserves trailing dot for in-progress typing", () => {
    expect(formatCurrencyInput("1234.")).toBe("1,234.");
  });

  it("strips non-numeric chars except dot", () => {
    expect(formatCurrencyInput("$1,234")).toBe("1,234");
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(2560)).toBe("2.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(5.5 * 1024 * 1024)).toBe("5.5 MB");
  });
});

describe("formatDate", () => {
  it("formats ISO date string", () => {
    // Use noon UTC to avoid timezone-shift issues
    const result = formatDate("2024-01-15T12:00:00Z");
    expect(result).toMatch(/Jan\s+15,\s+2024/);
  });

  it("formats Date object", () => {
    const result = formatDate(new Date("2024-06-01T12:00:00Z"));
    expect(result).toMatch(/Jun\s+1,\s+2024/);
  });
});

describe("formatDateTime", () => {
  it("includes time component", () => {
    const result = formatDateTime("2024-01-15T14:30:00Z");
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/2024/);
    // Should include time (hour:minute)
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});
