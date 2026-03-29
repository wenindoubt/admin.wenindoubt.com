type Listener = (text: string, done: boolean, error?: string) => void;

interface ActiveAnalysis {
  text: string;
  done: boolean;
  error?: string;
  prompt: string | null;
  completedAt: number | null;
  listeners: Set<Listener>;
}

/** Auto-clean completed entries after 60s */
const STALE_MS = 60_000;

const analyses = new Map<string, ActiveAnalysis>();

export function getActiveAnalysis(dealId: string) {
  const entry = analyses.get(dealId);
  if (!entry) return undefined;
  if (
    entry.done &&
    entry.completedAt &&
    Date.now() - entry.completedAt > STALE_MS
  ) {
    analyses.delete(dealId);
    return undefined;
  }
  return entry;
}

export function subscribeAnalysis(
  dealId: string,
  listener: Listener,
): () => void {
  const entry = analyses.get(dealId);
  if (!entry) return () => {};
  entry.listeners.add(listener);
  return () => {
    entry.listeners.delete(listener);
  };
}

/** Start analysis if not already in progress. Fire-and-forget. */
export function startAnalysis(dealId: string, prompt?: string) {
  const existing = analyses.get(dealId);
  if (existing && !existing.done) return;

  const entry: ActiveAnalysis = {
    text: "",
    done: false,
    prompt: prompt ?? null,
    completedAt: null,
    listeners: new Set(),
  };
  analyses.set(dealId, entry);
  performFetch(dealId, prompt, entry);
}

async function performFetch(
  dealId: string,
  prompt: string | undefined,
  entry: ActiveAnalysis,
) {
  try {
    const body: Record<string, string> = { dealId };
    if (prompt) body.prompt = prompt;

    const res = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      entry.text += decoder.decode(value, { stream: true });
      for (const fn of entry.listeners) fn(entry.text, false);
    }

    entry.done = true;
    entry.completedAt = Date.now();
    for (const fn of entry.listeners) fn(entry.text, true);
    scheduleCleanup(dealId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    entry.error = msg;
    entry.done = true;
    entry.completedAt = Date.now();
    for (const fn of entry.listeners) fn(entry.text, true, msg);
    scheduleCleanup(dealId);
  }
}

/** Remove completed entries even if never read again */
function scheduleCleanup(dealId: string) {
  setTimeout(() => {
    const entry = analyses.get(dealId);
    if (entry?.done) analyses.delete(dealId);
  }, STALE_MS);
}
