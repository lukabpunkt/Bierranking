"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Group, Profile, Role } from "@/lib/types";

export type MyGroup = Group & { role: Role; member_count: number };

type SessionState =
  | { status: "loading"; user: null; profile: null; groups: MyGroup[] }
  | { status: "out"; user: null; profile: null; groups: MyGroup[] }
  | { status: "in"; user: User; profile: Profile; groups: MyGroup[] };

type Ctx = SessionState & {
  reloadGroups: () => Promise<MyGroup[]>;
  setProfile: (p: Profile) => void;
  reload: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession muss innerhalb von SessionProvider verwendet werden");
  return ctx;
}

async function fetchGroups(userId: string): Promise<MyGroup[]> {
  const { data } = await createClient()
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

/** Ersetzt die frühere Server-Logik: Session, Profil und eigene Gruppen – alles im Browser. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading", user: null, profile: null, groups: [] });

  const load = useCallback(async (user: User | null) => {
    if (!user) {
      setState({ status: "out", user: null, profile: null, groups: [] });
      return;
    }
    const supabase = createClient();
    const [{ data: profile }, groups] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      fetchGroups(user.id),
    ]);
    if (!profile) {
      setState({ status: "out", user: null, profile: null, groups: [] });
      return;
    }
    setState({ status: "in", user, profile, groups });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let currentUserId: string | null | undefined;
    supabase.auth.getSession().then(({ data }) => {
      currentUserId = data.session?.user.id ?? null;
      void load(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      // Token-Refresh ändert nichts am Nutzer → nicht neu laden
      if (id === currentUserId) return;
      currentUserId = id;
      // Außerhalb des Auth-Callbacks laden (Supabase empfiehlt keine await-Aufrufe darin)
      setTimeout(() => void load(session?.user ?? null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const reloadGroups = useCallback(async () => {
    if (state.status !== "in") return [];
    const groups = await fetchGroups(state.user.id);
    setState((s) => (s.status === "in" ? { ...s, groups } : s));
    return groups;
  }, [state]);

  const setProfile = useCallback((profile: Profile) => {
    setState((s) => (s.status === "in" ? { ...s, profile } : s));
  }, []);

  const reload = useCallback(async () => {
    const { data } = await createClient().auth.getSession();
    await load(data.session?.user ?? null);
  }, [load]);

  return (
    <SessionContext.Provider value={{ ...state, reloadGroups, setProfile, reload }}>{children}</SessionContext.Provider>
  );
}
