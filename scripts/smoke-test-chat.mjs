#!/usr/bin/env node
/**
 * Smoke test for /api/chat: asserts the endpoint is reachable and never
 * returns a 5xx. A 429 (rate limited) or 400 (validation/guardrail) is
 * expected/healthy behavior, not a failure — this only guards against the
 * endpoint being genuinely broken (crashed route, misconfigured env vars,
 * unreachable Supabase/LLM gateway, etc).
 *
 * Usage:
 *   node scripts/smoke-test-chat.mjs [url]
 *   SMOKE_TEST_URL=https://aravindbalineni.code2vibe.dev node scripts/smoke-test-chat.mjs
 *
 * Exit code 0 = pass, 1 = fail. Used by
 * .github/workflows/chat-smoke-test.yml and for manual post-deploy checks.
 */

const DEFAULT_URL = "https://aravindbalineni.code2vibe.dev";
const rawUrl = process.argv[2] || process.env.SMOKE_TEST_URL || DEFAULT_URL;
const baseUrl = rawUrl.replace(/\/+$/, "");
const endpoint = `${baseUrl}/api/chat`;

async function main() {
  console.log(`[smoke:chat] POST ${endpoint}`);

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "What does Aravind do?" }),
    });
  } catch (error) {
    console.error(`[smoke:chat] FAIL — request could not be sent: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const bodyText = await response.text().catch(() => "");
  console.log(`[smoke:chat] status ${response.status}`);
  if (bodyText) {
    console.log(`[smoke:chat] body: ${bodyText.slice(0, 500)}`);
  }

  if (response.status >= 500) {
    console.error(`[smoke:chat] FAIL — server error (${response.status}). The endpoint should never 5xx.`);
    process.exitCode = 1;
    return;
  }

  if (response.status === 404) {
    console.error("[smoke:chat] FAIL — endpoint not found (404). Is the route deployed at this URL?");
    process.exitCode = 1;
    return;
  }

  console.log("[smoke:chat] PASS — endpoint responded without a server error.");
}

main();
