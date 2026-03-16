/**
 * Basic API protection for edge runtime.
 * - Origin check: rejects requests not from our own domain
 * - Rate limit: sliding window per IP for LLM-calling paths
 */

// ─── Origin check ────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean)
);

export function checkOrigin(req: Request): Response | null {
  // Skip in development
  if (process.env.NODE_ENV === "development") return null;

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // Must have at least one
  if (!origin && !referer) {
    return forbidden();
  }

  // Check origin header first, fall back to referer
  const source = origin ?? new URL(referer!).origin;

  if (!ALLOWED_ORIGINS.has(source)) {
    return forbidden();
  }

  return null;
}

function forbidden(): Response {
  return new Response(
    JSON.stringify({ error: "Forbidden" }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

// ─── Rate limit ──────────────────────────────────────────────────────────────

const store = new Map<string, number[]>();

const MAX_REQUESTS = 20; // per window
const WINDOW_MS = 60 * 1000; // 1 minute

export function rateLimit(req: Request): Response | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const now = Date.now();
  const timestamps = store.get(ip) ?? [];

  // Drop entries outside the window
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((recent[0] + WINDOW_MS - now) / 1000);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again shortly." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  recent.push(now);
  store.set(ip, recent);

  // Periodic cleanup to prevent memory leak
  if (store.size > 10_000) {
    store.forEach((vals, key) => {
      if (vals.every((t: number) => now - t > WINDOW_MS)) {
        store.delete(key);
      }
    });
  }

  return null;
}
