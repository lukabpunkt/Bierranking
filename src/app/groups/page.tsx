import { loadMyGroups, requireUser } from "@/lib/session";
import { GroupsClient } from "./GroupsClient";

export const metadata = { title: "Meine Gruppen · Prost-Zeugnis" };

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: wantsNew } = await searchParams;
  const { supabase, user, profile } = await requireUser({ next: "/groups" });
  const groups = await loadMyGroups(supabase, user.id);
  return <GroupsClient groups={groups} profile={profile} focusNew={wantsNew === "1"} />;
}
