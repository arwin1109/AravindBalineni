/**
 * Cheap, pre-LLM regex screen for obvious prompt-injection / jailbreak
 * phrasing aimed at this assistant specifically.
 *
 * This is NOT the primary defense — the model is never given tool-calling
 * access (see lib/rag/llmClient.js), so there is nothing for a successful
 * injection to escalate into beyond off-topic text. This filter exists to
 * cheaply short-circuit the most common attempts before they spend an LLM
 * call or a visitor's rate-limit budget on something that was never going to
 * be a legitimate question about Aravind.
 *
 * False negatives are fine and expected (the system prompt + no-tools design
 * are what actually holds). False positives on genuine questions are the
 * thing to avoid, so patterns are kept narrow and unambiguously
 * meta/instructional rather than topical — nothing here should ever match a
 * real question about Aravind's work, skills, or projects.
 */
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(the\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|context)/i,
  /disregard\s+(all\s+)?(the\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i,
  /forget\s+(all\s+)?(your\s+|the\s+)?(previous|prior)\s*(instructions?|prompts?|rules?|training)/i,
  /\bsystem\s*prompt\b/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions|guidelines)/i,
  /what\s+(is|are|were)\s+your\s+(system\s+)?(prompt|instructions)/i,
  /\bjailbreak(ing)?\b/i,
  /\bDAN\s+mode\b/i,
  /\bdeveloper\s+mode\b/i,
  /you\s+(are|'re)\s+no\s+longer\s+(bound|restricted|limited)/i,
  /pretend\s+(that\s+)?you\s+(are|'re)\s+not\s+an?\s+(ai|assistant|chatbot)/i,
  /act\s+as\s+(if\s+you\s+(have|had)\s+no\s+(restrictions|rules|guardrails|filters))/i,
  /repeat\s+(everything|the\s+text|the\s+words)\s+(above|before\s+this)/i,
];

/**
 * Returns true if `message` matches a known injection/jailbreak pattern.
 * Callers should treat a `true` result as a hard block (400), not a
 * fail-open check — unlike the rate-limit backstops, there's no meaningful
 * "best effort" behavior for a pattern match.
 */
export function looksLikeInjectionAttempt(message) {
  if (typeof message !== "string" || !message.trim()) return false;
  return INJECTION_PATTERNS.some((pattern) => pattern.test(message));
}
