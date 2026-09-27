import { NextResponse } from "next/server";
import { createChatCompletion, createEmbedding, CohereApiError } from "@/lib/rag/llmClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TEMPORARY diagnostic endpoint. Isolates whether the chat-completions and
 * embeddings paths on Cohere's compatibility API each independently work,
 * so a persistent /api/chat 502 can be root-caused without ever exposing
 * COHERE_API_KEY — this runs server-side with the real key already in
 * the Lambda's env, so nobody needs to paste a secret anywhere to use it.
 *
 * Gated by DIAG_TOKEN (a random value set only in Vercel) via the
 * x-diag-token header. A missing/wrong token returns a plain 404 so the
 * route's existence isn't advertised.
 *
 * DELETE THIS FILE (and the DIAG_TOKEN env var) once the gateway issue is
 * resolved — this is a one-time diagnostic, not a permanent surface.
 */
export async function GET(request) {
  const expected = process.env.DIAG_TOKEN;
  const provided = request.headers.get("x-diag-token");
  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = { chat: null, embedding: null };

  try {
    const reply = await createChatCompletion(
      [{ role: "user", content: "Reply with exactly: OK" }],
      { maxTokens: 10 }
    );
    result.chat = { ok: true, reply };
  } catch (error) {
    result.chat = {
      ok: false,
      status: error instanceof CohereApiError ? error.status ?? null : null,
      message: error.message,
      cause: error instanceof CohereApiError ? String(error.cause ?? "").slice(0, 500) : undefined,
    };
  }

  try {
    const embedding = await createEmbedding("diagnostic test string");
    result.embedding = { ok: true, dimensions: embedding.length };
  } catch (error) {
    result.embedding = {
      ok: false,
      status: error instanceof CohereApiError ? error.status ?? null : null,
      message: error.message,
      cause: error instanceof CohereApiError ? String(error.cause ?? "").slice(0, 500) : undefined,
    };
  }

  return NextResponse.json(result);
}
