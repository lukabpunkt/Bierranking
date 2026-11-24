import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { BrowserContext } from "@playwright/test";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch {
    /* keine .env.local */
  }
  return { ...env, ...(process.env as Record<string, string>) };
}

export const env = loadEnv();
export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Meldet einen Testnutzer per Passwort an und überträgt die Session-Cookies (Format von @supabase/ssr)
 * in den Browser-Kontext. Der echte Magic-Link-Versand wird damit umgangen.
 */
export async function loginAs(context: BrowserContext, email: string, password: string) {
  const jar = new Map<string, string>();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach((c) => jar.set(c.name, c.value)),
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await new Promise((r) => setTimeout(r, 100));
  await context.addCookies(
    [...jar].map(([name, value]) => ({ name, value, domain: "localhost", path: "/", sameSite: "Lax" as const })),
  );
}

/** Direkter API-Client als bestimmter Nutzer (für RLS-Prüfungen). */
export async function apiAs(email: string, password: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}
