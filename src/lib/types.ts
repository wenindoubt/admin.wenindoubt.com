export const PAGE_SIZE = 25;
export const PAGE_SIZE_ACTIVITY = 5;
export const PAGE_SIZE_NOTES = 10;
export const PAGE_SIZE_TALENT_MATCHES = 5;

export type NoteEntityType = "deal" | "contact" | "company" | "talent";
export type LinkedEntity = { id: string; name: string };

/**
 * Builds a redirect URL to the last valid page when the current page
 * exceeds available data. Handles both single and multi-value params.
 */
export function lastPageUrl(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
  total: number,
  pageSize: number,
): string {
  const lastPage = Math.ceil(total / pageSize);
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "page" || !v) continue;
    for (const val of Array.isArray(v) ? v : [v]) sp.append(k, val);
  }
  sp.set("page", String(lastPage));
  return `${pathname}?${sp.toString()}`;
}
