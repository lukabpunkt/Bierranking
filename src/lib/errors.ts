type MaybeError = { message?: string; code?: string } | null | undefined;

const MESSAGES: Record<string, string> = {
  invalid_invite_code: "Dieser Einladungslink ist ungültig oder abgelaufen.",
  last_admin: "Du bist der letzte Admin. Mach vorher jemand anderen zum Admin.",
  forbidden: "Dafür fehlen dir die Rechte.",
  "not authenticated": "Bitte melde dich zuerst an.",
};

/** Übersetzt Supabase-/RPC-Fehler in deutsche, freundliche Meldungen. */
export function friendlyError(error: MaybeError, fallback = "Da ist etwas schiefgelaufen. Versuch es nochmal."): string {
  if (!error) return fallback;
  const msg = error.message ?? "";
  for (const key of Object.keys(MESSAGES)) if (msg.includes(key)) return MESSAGES[key];
  if (error.code === "23505") return "Das gibt es schon.";
  if (error.code === "42501") return "Dafür fehlen dir die Rechte.";
  if (/rate limit|too many/i.test(msg)) return "Zu viele Versuche. Warte kurz und probier es dann nochmal.";
  if (/failed to fetch|network/i.test(msg)) return "Keine Verbindung. Bist du online?";
  return fallback;
}

export function isUniqueViolation(error: MaybeError): boolean {
  return error?.code === "23505";
}

/** Nur relative, interne Pfade als Weiterleitungsziel erlauben. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
