const DEFAULT_BASE_URL = "https://omniroute.code2vibe.dev/v1";
const DEFAULT_CHAT_MODEL = "antigravity/gemini-3.7-flash-high";
const REQUEST_TIMEOUT_MS = 20_000;

export class OmniRouteError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message);
    this.name = "OmniRouteError";
    this.status = status;
    this.cause = cause;
  }
}

function getConfig() {
  const baseUrl = (process.env.OMNIROUTE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiKey = process.env.OMNIROUTE_API_KEY;
  const chatModel = process.env.CHAT_MODEL || DEFAULT_CHAT_MODEL;
  const embeddingModel = process.env.EMBEDDING_MODEL;
  return { baseUrl, apiKey, chatModel, embeddingModel };
}

async function omniRouteFetch(path, body) {
  const { baseUrl, apiKey } = getConfig();
  if (!apiKey) {
    throw new OmniRouteError("OMNIROUTE_API_KEY is not set.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    throw new OmniRouteError(`Failed to reach the LLM gateway (${path}).`, { cause: error });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new OmniRouteError(`LLM gateway returned ${response.status} for ${path}.`, {
      status: response.status,
      cause: text,
    });
  }

  return response.json();
}

/**
 * Creates an embedding for `text` using the OpenAI-compatible /embeddings
 * endpoint on the omniroute gateway.
 *
 * EMBEDDING_MODEL has no hardcoded default on purpose: which model on the
 * gateway supports embeddings (and at what dimension) is not something this
 * code can verify without a live API key, so it must be set explicitly once
 * confirmed. portfolio_vec.embedding is left as an unconstrained `vector`
 * column for the same reason.
 */
export async function createEmbedding(text) {
  const { embeddingModel } = getConfig();
  if (!embeddingModel) {
    throw new OmniRouteError(
      "EMBEDDING_MODEL is not set. Confirm an embeddings-capable model on the omniroute gateway and set it in env."
    );
  }

  const data = await omniRouteFetch("/embeddings", {
    model: embeddingModel,
    input: text,
  });

  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new OmniRouteError("Unexpected /embeddings response shape from the LLM gateway.");
  }

  return embedding;
}

/**
 * Calls the OpenAI-compatible /chat/completions endpoint.
 *
 * Deliberately never sends `tools` / `functions` / `tool_choice`: the model
 * is never given tool-calling access. This is the primary guardrail against a
 * prompt-injection or jailbreak attempt escalating into an arbitrary action —
 * there is nothing for it to escalate into.
 */
export async function createChatCompletion(messages, { maxTokens = 400, temperature = 0.4 } = {}) {
  const { chatModel } = getConfig();

  const data = await omniRouteFetch("/chat/completions", {
    model: chatModel,
    messages,
    max_tokens: maxTokens,
    temperature,
  });

  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) {
    throw new OmniRouteError("Unexpected /chat/completions response shape from the LLM gateway.");
  }

  return reply.trim();
}
