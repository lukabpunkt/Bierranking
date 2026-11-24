import { redirect } from "next/navigation";
import { lastGroupId, loadMyGroups, requireUser } from "@/lib/session";

/** Startseite: direkt in die zuletzt genutzte Gruppe springen. */
export default async function Home() {
  const { supabase, user } = await requireUser();
  const groups = await loadMyGroups(supabase, user.id);
  if (groups.length === 0) redirect("/groups");
  const last = await lastGroupId();
  const target = groups.find((g) => g.id === last) ?? groups[0];
  redirect(`/g/${target.id}`);
}
