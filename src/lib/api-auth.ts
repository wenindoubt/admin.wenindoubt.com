import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";

const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60;

// In-memory rate limiter — per instance, resets on cold start.
// Acceptable for single-tenant serverless; upgrade to Upstash/Vercel KV if needed.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export type AuthResult =
  | { ok: true; keyId: string; keyName: string; keyPrefix: string }
  | { ok: false; status: number; message: string };

/**
 * Validates an inbound API request using API key + HMAC-SHA256 signature.
 *
 * Expected headers:
 *   X-API-Key   — the full API key (e.g. wid_abc123...)
 *   X-Signature — hex HMAC-SHA256 of "<unix_timestamp>.<raw_body>"
 *   X-Timestamp — Unix seconds (string)
 */
export async function validateApiRequest(
  request: Request,
  rawBody: string,
): Promise<AuthResult> {
  const apiKey = request.headers.get("x-api-key");
  const signature = request.headers.get("x-signature");
  const timestamp = request.headers.get("x-timestamp");

  if (!apiKey || !signature || !timestamp) {
    return { ok: false, status: 400, message: "Missing required auth headers: X-API-Key, X-Signature, X-Timestamp" };
  }

  // Validate timestamp is within the allowed window
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts * 1000) > TIMESTAMP_WINDOW_MS) {
    return { ok: false, status: 401, message: "Request expired or invalid timestamp" };
  }

  // Look up the key by hash
  const keyHash = createHash("sha256").update(apiKey).digest("hex");
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!row || row.revokedAt !== null) {
    return { ok: false, status: 401, message: "Invalid or revoked API key" };
  }

  // Rate limit by key prefix
  if (!checkRateLimit(row.keyPrefix)) {
    return { ok: false, status: 429, message: "Rate limit exceeded (60 req/min)" };
  }

  // Verify HMAC signature
  const sigValid = verifySignature(row.hmacSecret, timestamp, rawBody, signature);
  if (!sigValid) {
    return { ok: false, status: 401, message: "Invalid signature" };
  }

  // Update last_used_at without blocking the response
  after(async () => {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, row.id));
  });

  return { ok: true, keyId: row.id, keyName: row.name, keyPrefix: row.keyPrefix };
}

function verifySignature(
  secret: string,
  timestamp: string,
  body: string,
  provided: string,
): boolean {
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function checkRateLimit(keyPrefix: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(keyPrefix);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(keyPrefix, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;

  entry.count++;
  return true;
}
