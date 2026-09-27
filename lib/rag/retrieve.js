import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createEmbedding } from "@/lib/rag/llmClient";

/**
 * Embeds `query` and returns the top matching chunks from public.portfolio_vec
 * via the match_portfolio_vec() RPC (cosine distance, see the Supabase migration).
 */
export async function retrieveContext(query, { matchCount = 4, maxDistance = 0.6 } = {}) {
  const embedding = await createEmbedding(query);
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc("match_portfolio_vec", {
    query_embedding: embedding,
    match_count: matchCount,
    max_distance: maxDistance,
  });

  if (error) {
    throw new Error(`Portfolio vector search failed: ${error.message}`);
  }

  return data || [];
}
