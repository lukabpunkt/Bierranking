"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { authError } from "@/lib/errors";
import { Button, Field, inputClass } from "./ui";
import { useToast } from "./Toast";

const MIN = 6;

/** Passwort ändern, solange man angemeldet ist – ganz ohne E-Mail. */
export function PasswordForm() {
  const toast = useToast();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const mismatch = pw2.length > 0 && pw !== pw2;
  const tooShort = pw.length > 0 && pw.length < MIN;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast({ message: authError(error), tone: "error" });
    setPw("");
    setPw2("");
    toast({ message: "Passwort geändert 🔒" });
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <KeyRound size={20} aria-hidden /> Passwort ändern
      </h2>
      <Field label="Neues Passwort">
        <input
          type="password"
          autoComplete="new-password"
          className={inputClass}
          value={pw}
          minLength={MIN}
          placeholder={`mindestens ${MIN} Zeichen`}
          onChange={(e) => setPw(e.target.value)}
        />
      </Field>
      <Field label="Neues Passwort wiederholen">
        <input
          type="password"
          autoComplete="new-password"
          className={inputClass}
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
        />
      </Field>
      {(mismatch || tooShort) && (
        <p className="text-sm text-danger" role="alert">
          {tooShort ? `Mindestens ${MIN} Zeichen.` : "Die Passwörter stimmen nicht überein."}
        </p>
      )}
      <Button type="submit" variant="secondary" className="w-full" disabled={busy || !pw || pw !== pw2 || tooShort}>
        Passwort speichern
      </Button>
    </form>
  );
}
