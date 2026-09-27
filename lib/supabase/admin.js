import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service-role key.
 *
 * This bypasses RLS by design: public.portfolio_vec and public.portfolio_rate_limits
 * have RLS enabled with NO policies, so the anon/authenticated roles get zero access.
 * Only this service-role client (used exclusively from Next.js API routes, never
 * shipped to the browser) can read/write them.
 *
 * NEVER import this file from a "use client" component or expose
 * SUPABASE_SERVICE_ROLE_KEY via NEXT_PUBLIC_*.
 */
let cachedClient = null;

export function getSupabaseAdminClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cachedClient;
}
