import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { personalData } from "@/content/portfolio/personal";
import {
  CHAT_RATE_LIMIT,
  VISITOR_COOKIE_NAME,
  consumeRateLimit,
  getOrCreateVisitorId,
  visitorCookieOptions,
} from "@/lib/rag/rateLimit";
import { retrieveContext } from "@/lib/rag/retrieve";
import { buildSystemPrompt } from "@/lib/rag/systemPrompt";
import { createChatCompletion, OmniRouteError } from "@/lib/rag/omniroute";
import { getClientIp, hashIp } from "@/lib/rag/clientIp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_TURNS = 6;
// Secondary, more generous abuse backstop keyed by IP (hashed) rather than
// the visitor cookie, since a cookie is trivial to clear. This does not
// replace the 5-question-per-visitor limit, which stays the primary rule.
const IP_RATE_LIMIT = Number(process.env.PORTFOLIO_CHAT_IP_RATE_LIMIT) || 30;

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

  const history = sanitizeHistory(body?.history);

  const cookieStore = await cookies();
  const { visitorId, isNew } = getOrCreateVisitorId(cookieStore);

  let rateLimitResult;
  try {
    rateLimitResult = await consumeRateLimit(visitorId);

    // Secondary IP-based backstop — best-effort, never blocks the request if
    // the IP can't be determined or the check itself fails.
    const ip = getClientIp(request);
    if (ip) {
      const ipKey = `ip:${await hashIp(ip)}`;
      const { getSupabaseAdminClient } = await import("@/lib/supabase/admin");
      const supabase = getSupabaseAdminClient();
      await supabase
        .rpc("consume_portfolio_rate_limit", { p_visitor_id: ipKey, p_limit: IP_RATE_LIMIT })
        .single();
    }
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
    if (error instanceof OmniRouteError) {
      console.error("[api/chat] OmniRoute error:", error.message, error.cause ?? "");
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
