import { notFound } from "next/navigation";
import { loadMyGroups, requireUser } from "@/lib/session";
import { GroupProvider } from "@/components/GroupProvider";
import { AppShell } from "@/components/AppShell";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { supabase, user, profile } = await requireUser({ next: `/g/${groupId}` });
  const groups = await loadMyGroups(supabase, user.id);
  const current = groups.find((g) => g.id === groupId);
  if (!current) notFound();

  const { role, member_count: _count, ...group } = current;
  void _count;

  return (
    <GroupProvider initialGroup={group} role={role} groups={groups} profile={profile}>
      <AppShell>{children}</AppShell>
    </GroupProvider>
  );
}
