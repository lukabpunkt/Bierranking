import { lastGroupId, loadMyGroups, requireUser } from "@/lib/session";
import { GroupProvider } from "@/components/GroupProvider";
import { AppShell } from "@/components/AppShell";
import { MeClient } from "./MeClient";

export const metadata = { title: "Ich · Prost-Zeugnis" };

export default async function MePage() {
  const { supabase, user, profile } = await requireUser({ next: "/me" });
  const groups = await loadMyGroups(supabase, user.id);
  const last = await lastGroupId();
  const current = groups.find((g) => g.id === last) ?? groups[0] ?? null;

  let group = null;
  if (current) {
    const { role: _r, member_count: _c, ...rest } = current;
    void _r;
    void _c;
    group = rest;
  }

  return (
    <GroupProvider initialGroup={group} role={current?.role ?? null} groups={groups} profile={profile}>
      <AppShell>
        <MeClient email={user.email ?? ""} />
      </AppShell>
    </GroupProvider>
  );
}
