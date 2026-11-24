"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError, safeNext } from "@/lib/errors";
import { Button, Card, inputClass } from "@/components/ui";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
    : window.location.origin;
}

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") ? "Der Link war ungültig oder abgelaufen. Fordere einfach einen neuen an." : null,
  );

  // Erst im Browser berechnen (window gibt es beim Server-Rendering nicht)
  const callback = () => `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callback(), shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setError(friendlyError(error, "Der Link konnte nicht gesendet werden."));
    else setSent(true);
  }

  async function google() {
    await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
  }

  if (sent) {
    return (
      <Card className="text-center">
        <div className="mb-2 text-4xl" aria-hidden>
          📬
        </div>
        <h2 className="text-xl font-bold">Schau in dein Postfach</h2>
        <p className="mt-2 text-muted">
          Wir haben dir einen Anmelde-Link an <strong className="text-fg">{email}</strong> geschickt. Öffne ihn auf
          diesem Gerät.
        </p>
        <Button variant="ghost" className="mt-4" onClick={() => setSent(false)}>
          Andere E-Mail verwenden
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={sendLink} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-muted">E-Mail-Adresse</span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="du@beispiel.de"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy || !email}>
          <Mail size={20} aria-hidden /> {busy ? "Sende …" : "Link senden"}
        </Button>
        <p className="text-center text-sm text-muted">Kein Passwort nötig – du bleibst angemeldet.</p>
      </form>
      {process.env.NEXT_PUBLIC_ENABLE_GOOGLE === "true" && (
        <>
          <div className="my-4 flex items-center gap-3 text-sm text-muted">
            <span className="h-px flex-1 bg-line" /> oder <span className="h-px flex-1 bg-line" />
          </div>
          <Button variant="secondary" className="w-full" onClick={google}>
            Mit Google anmelden
          </Button>
        </>
      )}
    </Card>
  );
}
