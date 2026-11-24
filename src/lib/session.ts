import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "./supabase/server";
import type { Group, Profile, Role } from "./types";

export const LAST_GROUP_COOKIE = "pz_last_group";

/** Eingeloggten Nutzer + Profil laden. Leitet zu /login bzw. /onboarding um. */
export async function requireUser(opts: { allowNotOnboarded?: boolean; next?: string } = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(opts.next ? `/login?next=${encodeURIComponent(opts.next)}` : "/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");
  if (!profile.onboarded && !opts.allowNotOnboarded) {
    redirect(opts.next ? `/onboarding?next=${encodeURIComponent(opts.next)}` : "/onboarding");
  }
  return { supabase, user, profile: profile as Profile };
}

export type MyGroup = Group & { role: Role; member_count: number };

export async function loadMyGroups(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<MyGroup[]> {
  const { data } = await supabase
    .from("group_members")
    .select("role, groups(*, group_members(count))")
    .eq("user_id", userId);
  return (data ?? [])
    .filter((row) => row.groups)
    .map((row) => {
      const g = row.groups as unknown as Group & { group_members: { count: number }[] };
      const { group_members, ...rest } = g;
      return { ...rest, role: row.role as Role, member_count: group_members?.[0]?.count ?? 0 };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export async function lastGroupId(): Promise<string | undefined> {
  return (await cookies()).get(LAST_GROUP_COOKIE)?.value;
}
