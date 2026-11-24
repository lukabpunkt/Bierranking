import { readFileSync } from "node:fs";
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
 * Meldet einen Testnutzer per Passwort an und legt die Session dort ab, wo supabase-js sie
 * im Browser erwartet (localStorage „sb-<ref>-auth-token“). Der Magic-Link-Versand wird so umgangen.
 */
export async function loginAs(context: BrowserContext, email: string, password: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error("keine Session");
  const key = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
  await context.addInitScript(
    ([k, v]) => {
      if (!window.localStorage.getItem(k)) window.localStorage.setItem(k, v);
    },
    [key, JSON.stringify(data.session)] as const,
  );
}

/** Direkter API-Client als bestimmter Nutzer (für RLS-Prüfungen). */
export async function apiAs(email: string, password: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}
