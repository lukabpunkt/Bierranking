import { createClient as create, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

let client: SupabaseClient<Database> | undefined;

/** Ein Browser-Client für die ganze App. Session liegt im localStorage, Login per PKCE. */
export function createClient() {
  if (!client) {
    client = create<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}
