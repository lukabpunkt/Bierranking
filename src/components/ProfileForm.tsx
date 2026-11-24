"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COLORS, EMOJIS } from "@/lib/servings";
import { friendlyError } from "@/lib/errors";
import type { Profile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Button, Field, inputClass } from "./ui";
import { useToast } from "./Toast";

export function ProfileForm({
  profile,
  onboarding = false,
  redirectTo,
  onSaved,
}: {
  profile: Profile;
  onboarding?: boolean;
  redirectTo?: string;
  onSaved?: (p: Profile) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(profile.display_name);
  const [emoji, setEmoji] = useState(profile.emoji);
  const [color, setColor] = useState(profile.color);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await createClient()
      .from("profiles")
      .update({ display_name: name.trim(), emoji, color, onboarded: true })
      .eq("id", profile.id)
      .select()
      .single();
    setBusy(false);
    if (error || !data) {
      toast({ message: friendlyError(error), tone: "error" });
      return;
    }
    onSaved?.(data);
    if (redirectTo) {
      router.replace(redirectTo);
      router.refresh();
    } else {
      toast({ message: "Profil gespeichert" });
      router.refresh();
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar profile={{ emoji, color, display_name: name }} size="lg" />
        <div className="min-w-0 flex-1">
          <Field label="Name">
            <input
              className={inputClass}
              value={name}
              maxLength={30}
              required
              autoComplete="nickname"
              placeholder="Dein Spitzname"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-muted">Emoji</legend>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              aria-pressed={emoji === e}
              aria-label={`Emoji ${e}`}
              className={`flex h-12 items-center justify-center rounded-2xl text-2xl transition ${
                emoji === e ? "bg-accent/25 ring-2 ring-accent" : "bg-card hover:bg-card-2"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-muted">Farbe</legend>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-pressed={color === c}
              aria-label={`Farbe ${c}`}
              className="flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 ring-offset-bg transition"
              style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 3px var(--fg)` : undefined }}
            >
              {color === c && <Check size={20} className="text-white drop-shadow" aria-hidden />}
            </button>
          ))}
        </div>
      </fieldset>

      <Button type="submit" className="w-full" disabled={busy || !name.trim()}>
        {busy ? "Speichere …" : onboarding ? "Los geht's 🍻" : "Speichern"}
      </Button>
    </form>
  );
}
