import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const VISITOR_COOKIE_NAME = "pv_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year
export const CHAT_RATE_LIMIT = Number(process.env.PORTFOLIO_CHAT_RATE_LIMIT) || 5;

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
 * Atomically checks-and-increments the visitor's request count against
 * public.consume_portfolio_rate_limit (see the Supabase migration). This is
 * the authoritative limit enforcement — the cookie only identifies the
 * visitor, it never carries the count itself, so it can't be tampered with
 * client-side to reset the limit.
 */
export async function consumeRateLimit(visitorId) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .rpc("consume_portfolio_rate_limit", {
      p_visitor_id: visitorId,
      p_limit: CHAT_RATE_LIMIT,
    })
    .single();

  if (error) {
    throw new Error(`Rate limit check failed: ${error.message}`);
  }

  return {
    allowed: data.allowed,
    remaining: data.remaining,
    requestCount: data.request_count,
  };
}
