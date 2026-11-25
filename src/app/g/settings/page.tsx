"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, LogOut, RefreshCw, Share2, Shield, Trash2, UserMinus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { forgetGroup } from "@/lib/lastGroup";
import { absoluteUrl } from "@/lib/paths";
import { useSession } from "@/components/SessionProvider";
import type { Member } from "@/lib/types";
import { useGroup } from "@/components/GroupProvider";
import { Avatar } from "@/components/Avatar";
import { BottomSheet } from "@/components/BottomSheet";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { SkeletonBlock } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const { reloadGroups } = useSession();
  const { group, setGroup, isAdmin, members, setMembers, me, loading } = useGroup();
  const [name, setName] = useState(group?.name ?? "");
  const [confirm, setConfirm] = useState<"leave" | "delete" | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();
  const inviteUrl = group && typeof window !== "undefined" ? absoluteUrl(`/join/?code=${group.invite_code}`) : "";

  if (!group) return null;

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.from("groups").update({ name: name.trim() }).eq("id", group!.id).select().single();
    if (error || !data) return toast({ message: friendlyError(error), tone: "error" });
    setGroup(data);
    toast({ message: "Gruppenname gespeichert" });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({ message: "Link kopiert 📋" });
    } catch {
      toast({ message: "Kopieren nicht möglich – bitte manuell markieren.", tone: "error" });
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Prost-Zeugnis: ${group!.name}`, text: `Komm in unsere Bier-Gruppe „${group!.name}“ 🍻`, url: inviteUrl });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    await copy();
  }

  async function regenerate() {
    const { data, error } = await supabase.rpc("regenerate_invite_code", { p_group: group!.id });
    if (error || !data) return toast({ message: friendlyError(error), tone: "error" });
    setGroup();
    toast({ message: "Neuer Link erzeugt – der alte funktioniert nicht mehr." });
  }

  async function makeAdmin(m: Member) {
    const { error } = await supabase.from("group_members").update({ role: "admin" }).eq("group_id", group!.id).eq("user_id", m.user_id);
    if (error) return toast({ message: friendlyError(error), tone: "error" });
    setMembers(members.map((x) => (x.user_id === m.user_id ? { ...x, role: "admin" } : x)));
    toast({ message: `${m.profile.display_name} ist jetzt Admin` });
  }

  async function removeMember(m: Member) {
    const { error } = await supabase.from("group_members").delete().eq("group_id", group!.id).eq("user_id", m.user_id);
    if (error) return toast({ message: friendlyError(error), tone: "error" });
    setMembers(members.filter((x) => x.user_id !== m.user_id));
    toast({
      message: `${m.profile.display_name} entfernt`,
    });
  }

  async function leave() {
    setBusy(true);
    const { error } = await supabase.rpc("leave_group", { p_group: group!.id });
    setBusy(false);
    if (error) return toast({ message: friendlyError(error), tone: "error" });
    forgetGroup();
    await reloadGroups();
    router.replace("/groups/");
  }

  async function deleteGroup() {
    setBusy(true);
    const { error } = await supabase.from("groups").delete().eq("id", group!.id);
    setBusy(false);
    if (error) return toast({ message: friendlyError(error), tone: "error" });
    forgetGroup();
    await reloadGroups();
    router.replace("/groups/");
  }

  const sortedMembers = [...members].sort(
    (a, b) => (a.role === b.role ? a.profile.display_name.localeCompare(b.profile.display_name, "de") : a.role === "admin" ? -1 : 1),
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Gruppeneinstellungen</h1>

      {isAdmin && (
        <Card>
          <form onSubmit={rename} className="space-y-3">
            <Field label="Gruppenname">
              <input className={inputClass} value={name} maxLength={50} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Button type="submit" variant="secondary" className="w-full" disabled={!name.trim() || name.trim() === group.name}>
              Namen speichern
            </Button>
          </form>
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">Einladungslink</h2>
        <p className="text-sm text-muted">Wer diesen Link hat, kann der Gruppe beitreten.</p>
        <input
          readOnly
          value={inviteUrl}
          aria-label="Einladungslink"
          className={`${inputClass} text-sm`}
          onFocus={(e) => e.currentTarget.select()}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={copy}>
            <Copy size={18} aria-hidden /> Kopieren
          </Button>
          <Button onClick={share}>
            <Share2 size={18} aria-hidden /> Teilen
          </Button>
        </div>
        {isAdmin && (
          <Button variant="ghost" className="w-full" onClick={regenerate}>
            <RefreshCw size={18} aria-hidden /> Neuen Link erzeugen
          </Button>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Mitglieder ({members.length})</h2>
        {loading ? (
          <SkeletonBlock className="h-32" />
        ) : (
          <ul className="divide-y divide-line">
            {sortedMembers.map((m) => (
              <li key={m.user_id} className="flex min-h-14 items-center gap-3 py-2">
                <Avatar profile={m.profile} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {m.profile.display_name}
                    {m.user_id === me.id && <span className="text-muted"> (du)</span>}
                  </p>
                  {m.role === "admin" && (
                    <p className="flex items-center gap-1 text-sm text-accent-strong">
                      <Shield size={14} aria-hidden /> Admin
                    </p>
                  )}
                </div>
                {isAdmin && m.user_id !== me.id && (
                  <div className="flex gap-1">
                    {m.role !== "admin" && (
                      <button
                        type="button"
                        onClick={() => makeAdmin(m)}
                        className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-card-2"
                        aria-label={`${m.profile.display_name} zum Admin machen`}
                        title="Zum Admin machen"
                      >
                        <Shield size={20} aria-hidden />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMember(m)}
                      className="flex h-11 w-11 items-center justify-center rounded-full text-danger hover:bg-card-2"
                      aria-label={`${m.profile.display_name} entfernen`}
                      title="Entfernen"
                    >
                      <UserMinus size={20} aria-hidden />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-2">
        <Button variant="secondary" className="w-full" onClick={() => setConfirm("leave")}>
          <LogOut size={18} aria-hidden /> Gruppe verlassen
        </Button>
        {isAdmin && (
          <Button variant="ghost" className="w-full text-danger" onClick={() => setConfirm("delete")}>
            <Trash2 size={18} aria-hidden /> Gruppe löschen
          </Button>
        )}
      </Card>

      <BottomSheet
        open={confirm === "leave"}
        onClose={() => setConfirm(null)}
        title="Gruppe verlassen?"
      >
        <p className="mb-4 text-muted">
          Deine Bewertungen gehören dir und bleiben in deinen anderen Gruppen erhalten. Du kannst über einen
          Einladungslink wieder beitreten.
        </p>
        <Button className="w-full" variant="danger" disabled={busy} onClick={leave}>
          Ja, „{group.name}“ verlassen
        </Button>
      </BottomSheet>

      <BottomSheet
        open={confirm === "delete"}
        onClose={() => {
          setConfirm(null);
          setConfirmText("");
        }}
        title="Gruppe endgültig löschen?"
      >
        <p className="mb-3 text-muted">
          Die Gruppe und alle Mitgliedschaften werden <strong className="text-fg">unwiderruflich</strong> gelöscht. Die
          Bewertungen bleiben bei den Personen erhalten und erscheinen weiter in deren anderen Gruppen. Tippe zur
          Bestätigung den Gruppennamen ein:
        </p>
        <input
          className={`${inputClass} mb-3`}
          value={confirmText}
          placeholder={group.name}
          aria-label="Gruppenname zur Bestätigung"
          onChange={(e) => setConfirmText(e.target.value)}
        />
        <Button
          className="w-full"
          variant="danger"
          disabled={busy || confirmText.trim() !== group.name}
          onClick={deleteGroup}
        >
          Endgültig löschen
        </Button>
      </BottomSheet>
    </div>
  );
}
