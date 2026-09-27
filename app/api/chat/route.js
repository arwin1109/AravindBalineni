import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { personalData } from "@/content/portfolio/personal";
import {
  CHAT_RATE_LIMIT,
  VISITOR_COOKIE_NAME,
  consumeGlobalDailyLimit,
  consumeIpDailyLimit,
  consumeRateLimit,
  getOrCreateVisitorId,
  visitorCookieOptions,
} from "@/lib/rag/rateLimit";
import { retrieveContext } from "@/lib/rag/retrieve";
import { buildSystemPrompt } from "@/lib/rag/systemPrompt";
import { createChatCompletion, CohereApiError } from "@/lib/rag/llmClient";
import { getClientIp, hashIp } from "@/lib/rag/clientIp";
import { looksLikeInjectionAttempt } from "@/lib/rag/guardrailFilter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_TURNS = 6;
// Secondary, more generous abuse backstop keyed by hashed IP rather than the
// visitor cookie, since a cookie is trivial to clear. Day-bucketed (see
// todayUtcKey in lib/rag/rateLimit.js) so it behaves like an actual "N per
// day" limit rather than a lifetime cap. This does not replace the
// per-visitor limit, which stays the primary rule.
const IP_DAILY_RATE_LIMIT = Number(process.env.PORTFOLIO_CHAT_IP_RATE_LIMIT) || 30;

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (turn) =>
        turn &&
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string" &&
        turn.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({
      role: turn.role,
      content: turn.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }));
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Please keep questions under ${MAX_MESSAGE_LENGTH} characters.` },
      { status: 400 }
    );
  }

  if (looksLikeInjectionAttempt(message)) {
    console.warn("[api/chat] blocked message matching guardrail pre-filter");
    return NextResponse.json(
      {
        error: "guardrail_blocked",
        message: `I can only answer questions about ${personalData.name} and his work. Could you rephrase your question?`,
      },
      { status: 400 }
    );
  }

  const history = sanitizeHistory(body?.history);

  const cookieStore = await cookies();
  const { visitorId, isNew } = getOrCreateVisitorId(cookieStore);

  // Tier 1 (per-visitor lifetime cap) and Tier 2 (global daily cost cap) are
  // both hard, blocking checks against the same Supabase dependency, so a
  // failure in either means the assistant is genuinely unavailable right now
  // rather than something to silently fail open on.
  let rateLimitResult;
  let globalLimitResult;
  try {
    [rateLimitResult, globalLimitResult] = await Promise.all([
      consumeRateLimit(visitorId),
      consumeGlobalDailyLimit(),
    ]);
  } catch (error) {
    console.error("[api/chat] rate limit check failed:", error);
    return NextResponse.json(
      { error: "The assistant is temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  const responseInit = { status: 200 };
  const setVisitorCookie = (response) => {
    if (isNew) {
      response.cookies.set(VISITOR_COOKIE_NAME, visitorId, visitorCookieOptions());
    }
    return response;
  };

  if (!rateLimitResult.allowed) {
    return setVisitorCookie(
      NextResponse.json(
        {
          error: "rate_limited",
          message: `You've used all ${CHAT_RATE_LIMIT} questions for this session. Feel free to reach out to ${personalData.name} directly at ${personalData.email}.`,
          remaining: 0,
        },
        { status: 429 }
      )
    );
  }

  // Tier 2 result: the global daily cap protects total spend across every
  // visitor, not any one person's behavior, so it gets its own message and
  // doesn't zero out this visitor's own remaining count.
  if (!globalLimitResult.allowed) {
    console.warn("[api/chat] global daily rate limit reached");
    return setVisitorCookie(
      NextResponse.json(
        {
          error: "rate_limited",
          message: `This assistant has reached its capacity for today. Please try again tomorrow, or reach out to ${personalData.name} directly at ${personalData.email}.`,
          remaining: rateLimitResult.remaining,
        },
        { status: 429 }
      )
    );
  }

  // Tier 3: per-IP daily backstop. Isolated in its own try/catch so a
  // failure to even run this check (can't determine IP, transient DB
  // hiccup) never blocks the request — it fails OPEN on infrastructure
  // errors. But when the RPC call itself succeeds, its `allowed` result IS
  // enforced below (previously this call's result was discarded entirely,
  // so this backstop never actually blocked anything even when exceeded).
  try {
    const ip = getClientIp(request);
    if (ip) {
      const ipHash = await hashIp(ip);
      const ipLimitResult = await consumeIpDailyLimit(ipHash, IP_DAILY_RATE_LIMIT);
      if (!ipLimitResult.allowed) {
        console.warn("[api/chat] per-IP daily rate limit reached");
        return setVisitorCookie(
          NextResponse.json(
            {
              error: "rate_limited",
              message: `Too many questions from this network today. Feel free to reach out to ${personalData.name} directly at ${personalData.email}.`,
              remaining: 0,
            },
            { status: 429 }
          )
        );
      }
    }
  } catch (error) {
    console.error("[api/chat] IP rate limit backstop failed (non-blocking):", error);
  }

  try {
    const contextChunks = await retrieveContext(message);
    const systemPrompt = buildSystemPrompt(contextChunks);

    const reply = await createChatCompletion([
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ]);

    return setVisitorCookie(
      NextResponse.json(
        { reply, remaining: rateLimitResult.remaining },
        responseInit
      )
    );
  } catch (error) {
    if (error instanceof CohereApiError) {
      console.error("[api/chat] Cohere API error:", error.message, error.cause ?? "");
    } else {
      console.error("[api/chat] unexpected error:", error);
    }

    return setVisitorCookie(
      NextResponse.json(
        {
          error: "The assistant couldn't answer that just now. Please try again in a moment.",
          remaining: rateLimitResult.remaining,
        },
        { status: 502 }
      )
    );
  }
}
