"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { authError, safeNext } from "@/lib/errors";
import { Button, Card, inputClass } from "@/components/ui";
import { useSession } from "@/components/SessionProvider";
import { absoluteUrl } from "@/lib/paths";

export const MIN_PASSWORD = 6;

type Mode = "login" | "register";

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { status, reload } = useSession();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<Mode>(params.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") ? "Die Anmeldung hat nicht geklappt. Bitte nochmal versuchen." : null,
  );
  const [info, setInfo] = useState<string | null>(null);

  // Schon angemeldet → direkt weiter
  useEffect(() => {
    if (status === "in") router.replace(next);
  }, [status, next, router]);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setInfo(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const credentials = { email: email.trim(), password };

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword(credentials);
      if (error) {
        setBusy(false);
        setError(authError(error));
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp(credentials);
      if (error) {
        setBusy(false);
        setError(authError(error));
        return;
      }
      // Supabase meldet bei bereits registrierter Adresse (ohne Bestätigungspflicht) teils keinen Fehler,
      // sondern einen Nutzer ohne Identitäten.
      if (data.user && data.user.identities?.length === 0) {
        setBusy(false);
        setError("Diese E-Mail ist schon registriert. Melde dich an.");
        setMode("login");
        return;
      }
      if (!data.session) {
        setBusy(false);
        setInfo("Konto angelegt, muss aber noch per E-Mail bestätigt werden (Supabase-Einstellung „Confirm email“).");
        return;
      }
    }
    await reload();
    router.replace(next);
  }

  async function google() {
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: absoluteUrl(`/auth/callback/?next=${encodeURIComponent(next)}`) },
    });
  }

  const tooShort = mode === "register" && password.length > 0 && password.length < MIN_PASSWORD;

  return (
    <Card>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-card-2 p-1" role="tablist" aria-label="Anmelden oder registrieren">
        {(
          [
            ["login", "Anmelden"],
            ["register", "Registrieren"],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`min-h-11 rounded-xl font-bold transition ${mode === m ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-muted">E-Mail-Adresse</span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            placeholder="du@beispiel.de"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold text-muted">Passwort</span>
          <span className="relative block">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={mode === "register" ? MIN_PASSWORD : undefined}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              placeholder={mode === "register" ? `mindestens ${MIN_PASSWORD} Zeichen` : "Dein Passwort"}
              className={`${inputClass} pr-12`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
              className="absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </span>
          {tooShort && <span className="block text-xs text-danger">Mindestens {MIN_PASSWORD} Zeichen.</span>}
        </label>

        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-2xl bg-accent/15 px-4 py-3 text-sm font-medium" role="status">
            {info}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={busy || !email || !password || tooShort}>
          {mode === "login" ? <LogIn size={20} aria-hidden /> : <UserPlus size={20} aria-hidden />}
          {busy ? "Einen Moment …" : mode === "login" ? "Anmelden" : "Konto erstellen"}
        </Button>
        <p className="text-center text-sm text-muted">
          {mode === "login" ? (
            <>
              Noch kein Konto?{" "}
              <button type="button" className="min-h-11 font-semibold text-fg underline" onClick={() => switchMode("register")}>
                Jetzt registrieren
              </button>
            </>
          ) : (
            <>
              Schon registriert?{" "}
              <button type="button" className="min-h-11 font-semibold text-fg underline" onClick={() => switchMode("login")}>
                Anmelden
              </button>
            </>
          )}
        </p>
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
