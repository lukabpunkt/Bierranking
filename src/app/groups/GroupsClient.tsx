"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, LogIn, Plus, Shield, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useSession, type MyGroup } from "@/components/SessionProvider";
import { groupHref } from "@/lib/paths";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { useToast } from "@/components/Toast";

/** Akzeptiert den reinen Code oder einen kompletten Einladungslink. */
export function extractInviteCode(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/[?&]code=([A-Za-z0-9]+)/) ?? trimmed.match(/\/join\/([A-Za-z0-9]+)/);
  return (match ? match[1] : trimmed).toLowerCase();
}

export function GroupsClient({ groups, profile, focusNew }: { groups: MyGroup[]; profile: Profile; focusNew: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const { reloadGroups } = useSession();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    const { data, error } = await createClient().rpc("create_group", { p_name: name.trim() });
    if (error || !data) {
      setBusy(null);
      return toast({ message: friendlyError(error), tone: "error" });
    }
    await reloadGroups();
    router.push(groupHref(data.id));
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy("join");
    const { data, error } = await createClient().rpc("join_group", { p_code: extractInviteCode(code) });
    if (error || !data) {
      setBusy(null);
      return toast({ message: friendlyError(error), tone: "error" });
    }
    await reloadGroups();
    router.push(groupHref(data));
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[640px] px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Meine Gruppen</h1>
          <p className="text-muted">Hallo {profile.display_name} 👋</p>
        </div>
        <Link href="/me/" aria-label="Mein Profil" className="rounded-full">
          <Avatar profile={profile} size="md" />
        </Link>
      </header>

      {groups.length > 0 ? (
        <ul className="mb-8 space-y-3">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={groupHref(g.id)}
                className="flex min-h-16 items-center gap-3 rounded-2xl bg-card p-4 shadow-sm transition hover:bg-card-2"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-2xl" aria-hidden>
                  🍻
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-bold">{g.name}</span>
                  <span className="flex items-center gap-3 text-sm text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Users size={14} aria-hidden /> {g.member_count} {g.member_count === 1 ? "Mitglied" : "Mitglieder"}
                    </span>
                    {g.role === "admin" && (
                      <span className="inline-flex items-center gap-1">
                        <Shield size={14} aria-hidden /> Admin
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight className="text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="mb-8 text-center">
          <div className="text-4xl" aria-hidden>
            🍺
          </div>
          <p className="mt-2 font-bold">Noch keine Gruppe</p>
          <p className="text-muted">Erstelle eine Gruppe für deinen Freundeskreis oder tritt mit einem Einladungslink bei.</p>
        </Card>
      )}

      <div className="space-y-4">
        <Card>
          <form onSubmit={create} className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Plus size={20} aria-hidden /> Neue Gruppe
            </h2>
            <Field label="Name der Gruppe">
              <input
                className={inputClass}
                value={name}
                maxLength={50}
                autoFocus={focusNew}
                placeholder="z. B. Stammtisch"
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Button type="submit" className="w-full" disabled={!name.trim() || busy !== null}>
              {busy === "create" ? "Erstelle …" : "Gruppe erstellen"}
            </Button>
          </form>
        </Card>

        <Card>
          <form onSubmit={join} className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <LogIn size={20} aria-hidden /> Beitreten
            </h2>
            <Field label="Einladungslink oder Code">
              <input
                className={inputClass}
                value={code}
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="https://…/join/?code=abc123…"
                onChange={(e) => setCode(e.target.value)}
              />
            </Field>
            <Button type="submit" variant="secondary" className="w-full" disabled={!code.trim() || busy !== null}>
              {busy === "join" ? "Trete bei …" : "Mit Einladung beitreten"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
