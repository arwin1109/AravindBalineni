import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const VISITOR_COOKIE_NAME = "pv_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year
export const CHAT_RATE_LIMIT = Number(process.env.PORTFOLIO_CHAT_RATE_LIMIT) || 5;
// Circuit breaker on total LLM spend across ALL visitors, independent of any
// single visitor's or IP's behavior. Protects against cost blowouts from
// distributed abuse (many cookies/IPs) or an unexpectedly popular day.
export const GLOBAL_DAILY_RATE_LIMIT = Number(process.env.PORTFOLIO_CHAT_GLOBAL_DAILY_LIMIT) || 200;

/**
 * Reads the visitor id from an (already-resolved) Next.js cookie store,
 * generating a new one if this is a first-time visitor.
 */
export function getOrCreateVisitorId(cookieStore) {
  const existing = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
  if (existing) return { visitorId: existing, isNew: false };
  return { visitorId: crypto.randomUUID(), isNew: true };
}

export function visitorCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
}

/**
 * Returns today's date as a UTC YYYY-MM-DD string. The underlying
 * consume_portfolio_rate_limit table/function has no TTL or reset logic at
 * all — it's a plain lifetime counter per key — so "daily" limits are
 * implemented by bucketing the key on this string: a new day means a new
 * key, which starts counting from zero. Old rows just accumulate harmlessly
 * (they're tiny — visitor_id + 2 ints) and aren't currently pruned.
 */
export function todayUtcKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Generic wrapper around the consume_portfolio_rate_limit RPC (see the
 * Supabase migration). This is the one place that actually talks to
 * Postgres for rate limiting — the per-visitor, global, and per-IP limits
 * below all share this same atomic check-and-increment-capped-at-N
 * function; only the key and limit differ.
 */
async function consumeKeyedLimit(key, limit) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .rpc("consume_portfolio_rate_limit", {
      p_visitor_id: key,
      p_limit: limit,
    })
    .single();

  if (error) {
    throw new Error(`Rate limit check failed for key "${key}": ${error.message}`);
  }

  return {
    allowed: data.allowed,
    remaining: data.remaining,
    requestCount: data.request_count,
  };
}

/**
 * Atomically checks-and-increments the visitor's lifetime request count.
 * This is the primary, authoritative limit — the cookie only identifies the
 * visitor, it never carries the count itself, so it can't be tampered with
 * client-side to reset the limit.
 */
export async function consumeRateLimit(visitorId) {
  return consumeKeyedLimit(visitorId, CHAT_RATE_LIMIT);
}

/**
 * Global daily cap shared across every visitor. Blocking (unlike the per-IP
 * backstop below): if this is exhausted, the assistant stops answering for
 * everyone until the UTC day rolls over, by design — it exists specifically
 * to put a ceiling on total daily LLM cost/load.
 */
export async function consumeGlobalDailyLimit() {
  return consumeKeyedLimit(`global:${todayUtcKey()}`, GLOBAL_DAILY_RATE_LIMIT);
}

/**
 * Per-IP daily backstop — more generous than the per-visitor limit, to catch
 * abuse from someone clearing their cookie. Callers should treat failures to
 * reach this (network/DB errors) as fail-open (best-effort), but MUST honor
 * `allowed: false` when the call succeeds.
 */
export async function consumeIpDailyLimit(ipHash, limit) {
  return consumeKeyedLimit(`ip:${ipHash}:${todayUtcKey()}`, limit);
}
