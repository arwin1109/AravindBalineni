const BASE_URL = (process.env.COHERE_BASE_URL || "https://api.cohere.ai/compatibility/v1").replace(/\/+$/, "");
const DEFAULT_CHAT_MODEL = "command-a-plus-05-2026";
const DEFAULT_EMBEDDING_MODEL = "embed-v4.0";
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Cohere via its OpenAI-compatible "Compatibility API"
 * (https://docs.cohere.com/docs/compatibility-api): same request/response
 * shape as OpenAI's /chat/completions and /embeddings, so this client is a
 * thin, generic OpenAI-shaped fetch wrapper rather than anything
 * Cohere-specific in its request/parsing logic.
 *
 * Known compatibility-layer limitations (not exposed by this client):
 * chat does not support store/metadata/logit_bias/top_logprobs/n/modalities/
 * prediction; embeddings does not support dimensions/input_type/images/
 * truncate — those Cohere-native params would require calling
 * api.cohere.com/v2/{chat,embed} directly instead.
 */
export class CohereApiError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message);
    this.name = "CohereApiError";
    this.status = status;
    this.cause = cause;
  }
}

function getConfig() {
  const apiKey = process.env.COHERE_API_KEY;
  const chatModel = process.env.CHAT_MODEL || DEFAULT_CHAT_MODEL;
  const embeddingModel = process.env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  return { apiKey, chatModel, embeddingModel };
}

async function cohereFetch(path, body) {
  const { apiKey } = getConfig();
  if (!apiKey) {
    throw new CohereApiError("COHERE_API_KEY is not set.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    throw new CohereApiError(`Failed to reach the Cohere API (${path}).`, { cause: error });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new CohereApiError(`Cohere API returned ${response.status} for ${path}.`, {
      status: response.status,
      cause: text,
    });
  }

  return response.json();
}

/**
 * Creates an embedding for `text` via Cohere's OpenAI-compatible /embeddings
 * endpoint. Note: the compatibility layer ignores `input_type`, so this
 * uses whatever the model's default input handling is rather than Cohere's
 * native search_document/search_query distinction — acceptable here since
 * both ingestion and query-time retrieval go through the same call shape.
 */
export async function createEmbedding(text) {
  const { embeddingModel } = getConfig();

  const data = await cohereFetch("/embeddings", {
    model: embeddingModel,
    input: text,
  });

  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new CohereApiError("Unexpected /embeddings response shape from Cohere.");
  }

  return embedding;
}

/**
 * Calls Cohere's OpenAI-compatible /chat/completions endpoint.
 *
 * Deliberately never sends `tools` / `functions` / `tool_choice`: the model
 * is never given tool-calling access. This is the primary guardrail against a
 * prompt-injection or jailbreak attempt escalating into an arbitrary action —
 * there is nothing for it to escalate into.
 */
export async function createChatCompletion(messages, { maxTokens = 400, temperature = 0.4 } = {}) {
  const { chatModel } = getConfig();

  const data = await cohereFetch("/chat/completions", {
    model: chatModel,
    messages,
    max_tokens: maxTokens,
    temperature,
  });

  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) {
    throw new CohereApiError("Unexpected /chat/completions response shape from Cohere.");
  }

  return reply.trim();
}
