// Client Supabase côté SERVEUR avec la service role key (bypass RLS).
// À n'utiliser QUE dans des composants/route handlers serveur (jamais exposé au client).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
