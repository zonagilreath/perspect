/**
 * Basic API protection for edge runtime.
 * - Origin check: rejects requests not from our own domain
 * - Rate limit: sliding window per IP for LLM-calling paths
 *
 * ALLOWED_ORIGINS supports two formats (comma-separated):
 *   Exact:    https://perspect-iota.vercel.app
 *   Wildcard: *.vercel.app  (matches any subdomain)
 */

// ─── Origin check ────────────────────────────────────────────────────────────

const RAW_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  return RAW_ORIGINS.some((pattern) => {
    if (pattern.startsWith("*.")) {
      // Wildcard: *.vercel.app matches https://anything.vercel.app
      const suffix = pattern.slice(1); // ".vercel.app"
      try {
        const { hostname } = new URL(origin);
        return hostname.endsWith(suffix);
      } catch {
        return false;
      }
    }
    // Exact match
    return origin === pattern;
  });
}

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
  let source: string;
  try {
    source = origin ?? new URL(referer!).origin;
  } catch {
    return forbidden();
  }

  if (!isAllowedOrigin(source)) {
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
