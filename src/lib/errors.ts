type MaybeError = { message?: string; code?: string } | null | undefined;

const MESSAGES: Record<string, string> = {
  invalid_invite_code: "Dieser Einladungslink ist ungültig oder abgelaufen.",
  last_admin: "Du bist der letzte Admin. Mach vorher jemand anderen zum Admin.",
  forbidden: "Dafür fehlen dir die Rechte.",
  beer_in_use: "Andere haben dieses Bier schon bewertet oder auf der Wunschliste – löschen kannst du nur deine eigene Bewertung.",
  not_creator: "Löschen kann nur, wer das Bier angelegt hat.",
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

/** Deutsche Meldungen für Anmeldung/Registrierung. */
export function authError(error: MaybeError): string {
  const msg = error?.message ?? "";
  if (/invalid login credentials/i.test(msg)) return "E-Mail oder Passwort ist falsch.";
  if (/already registered|already exists/i.test(msg)) return "Diese E-Mail ist schon registriert. Melde dich an.";
  if (/email not confirmed/i.test(msg)) return "Dieses Konto ist noch nicht bestätigt.";
  if (/password should be at least|password.*(short|length)/i.test(msg)) return "Das Passwort ist zu kurz.";
  if (/weak|pwned|easy to guess/i.test(msg)) return "Dieses Passwort ist zu unsicher. Nimm ein anderes.";
  if (/is invalid|invalid email|unable to validate email/i.test(msg)) return "Diese E-Mail-Adresse ist ungültig.";
  if (/signups not allowed|signup.*disabled/i.test(msg)) return "Registrierungen sind gerade deaktiviert.";
  if (/email rate limit/i.test(msg)) return "Registrierung gerade nicht möglich. Bitte später nochmal versuchen.";
  if (/rate limit|too many/i.test(msg)) return "Zu viele Versuche. Warte kurz und probier es dann nochmal.";
  if (/same.*password|different from the old/i.test(msg)) return "Das neue Passwort muss sich vom alten unterscheiden.";
  return friendlyError(error, "Das hat nicht geklappt. Versuch es nochmal.");
}
