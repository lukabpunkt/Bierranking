"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { average } from "@/lib/grades";
import type { Beer, Group, Member, Profile, Rating, Role, Serving } from "@/lib/types";
import { unknownProfile } from "@/lib/types";
import type { MyGroup } from "@/lib/session";
import { useRevealed } from "@/hooks/useRevealed";
import { rememberGroup } from "@/lib/lastGroup";

export type BeerStats = {
  avg: number | null;
  count: number;
  raters: string[];
  servings: Serving[];
  avgBy: Record<Serving, number | null>;
  myRated: boolean;
  lastRatedAt: string | null;
};

type Ctx = {
  groupId: string | null;
  group: Group | null;
  setGroup: (g: Group) => void;
  role: Role | null;
  isAdmin: boolean;
  groups: MyGroup[];
  me: Profile;
  setMe: (p: Profile) => void;
  members: Member[];
  setMembers: (m: Member[]) => void;
  profileOf: (id: string) => Profile;
  beers: Beer[];
  beerById: Map<string, Beer>;
  ratings: Rating[];
  stats: Map<string, BeerStats>;
  loading: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
  hideGrades: boolean;
  setHideGrades: (v: boolean) => Promise<void>;
  isHidden: (beerId: string) => boolean;
  reveal: (beerId: string) => void;
  revealAll: () => void;
  allRevealed: boolean;
  wasJustRevealed: (beerId: string) => boolean;
};

const GroupContext = createContext<Ctx | null>(null);

export function useGroup() {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error("useGroup muss innerhalb von GroupProvider verwendet werden");
  return ctx;
}

const PAGE = 1000;

/** Lädt alle Zeilen (Supabase liefert standardmäßig max. 1000 pro Anfrage). */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export function GroupProvider({
  initialGroup,
  role,
  groups,
  profile,
  children,
}: {
  initialGroup: Group | null;
  role: Role | null;
  groups: MyGroup[];
  profile: Profile;
  children: React.ReactNode;
}) {
  const groupId = initialGroup?.id ?? null;
  const [group, setGroup] = useState(initialGroup);
  const [me, setMe] = useState(profile);
  const [members, setMembers] = useState<Member[]>([]);
  const [beers, setBeers] = useState<Beer[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(!!groupId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const revealedState = useRevealed(groupId);
  const loadSeq = useRef(0);

  // Server-Props können sich nach router.refresh() ändern → lokalen Zustand angleichen
  const [prevProps, setPrevProps] = useState({ initialGroup, profile });
  if (prevProps.initialGroup !== initialGroup || prevProps.profile !== profile) {
    setPrevProps({ initialGroup, profile });
    setGroup(initialGroup);
    setMe(profile);
  }

  const refresh = useCallback(async () => {
    if (!groupId) return;
    const seq = ++loadSeq.current;
    const supabase = createClient();
    try {
      const [memberRows, beerRows, ratingRows] = await Promise.all([
        fetchAll((from, to) =>
          supabase
            .from("group_members")
            .select("user_id, role, joined_at, profiles(*)")
            .eq("group_id", groupId)
            .range(from, to),
        ),
        fetchAll((from, to) =>
          supabase
            .from("beers")
            .select("*")
            .eq("group_id", groupId)
            .is("deleted_at", null)
            .order("created_at")
            .range(from, to),
        ),
        fetchAll((from, to) =>
          supabase
            .from("ratings")
            .select("*, beers!inner(group_id)")
            .eq("beers.group_id", groupId)
            .is("deleted_at", null)
            .order("created_at")
            .range(from, to),
        ),
      ]);
      if (seq !== loadSeq.current) return;
      setMembers(
        memberRows.map((m) => ({
          user_id: m.user_id,
          role: m.role as Role,
          joined_at: m.joined_at,
          profile: (m.profiles as unknown as Profile) ?? unknownProfile(m.user_id),
        })),
      );
      setBeers(beerRows);
      setRatings(
        ratingRows.map((r) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { beers: _join, ...rest } = r as typeof r & { beers: unknown };
          return { ...rest, grade: Number(rest.grade) } as Rating;
        }),
      );
      setLoadError(null);
    } catch (e) {
      if (seq === loadSeq.current) setLoadError(e instanceof Error ? e.message : "Fehler beim Laden");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialer Datenabruf
    void refresh();
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  // Zuletzt genutzte Gruppe merken
  useEffect(() => {
    if (groupId) rememberGroup(groupId);
  }, [groupId]);

  const profileMap = useMemo(() => {
    const m = new Map<string, Profile>();
    for (const mem of members) m.set(mem.user_id, mem.profile);
    m.set(me.id, me);
    return m;
  }, [members, me]);

  const profileOf = useCallback((id: string) => profileMap.get(id) ?? unknownProfile(id), [profileMap]);

  const beerById = useMemo(() => new Map(beers.map((b) => [b.id, b])), [beers]);

  const stats = useMemo(() => {
    const byBeer = new Map<string, Rating[]>();
    for (const r of ratings) {
      if (!beerById.has(r.beer_id)) continue;
      const list = byBeer.get(r.beer_id) ?? [];
      list.push(r);
      byBeer.set(r.beer_id, list);
    }
    const out = new Map<string, BeerStats>();
    for (const b of beers) {
      const list = byBeer.get(b.id) ?? [];
      const by = (s: Serving) => average(list.filter((r) => r.serving === s).map((r) => r.grade));
      out.set(b.id, {
        avg: average(list.map((r) => r.grade)),
        count: list.length,
        raters: [...new Set(list.map((r) => r.user_id))],
        servings: (["can", "bottle", "tap"] as Serving[]).filter((s) => list.some((r) => r.serving === s)),
        avgBy: { can: by("can"), bottle: by("bottle"), tap: by("tap") },
        myRated: list.some((r) => r.user_id === me.id),
        lastRatedAt: list.reduce<string | null>((acc, r) => (!acc || r.updated_at > acc ? r.updated_at : acc), null),
      });
    }
    return out;
  }, [beers, ratings, beerById, me.id]);

  const setHideGrades = useCallback(
    async (v: boolean) => {
      setMe((p) => ({ ...p, hide_grades: v }));
      const { error } = await createClient().from("profiles").update({ hide_grades: v }).eq("id", me.id);
      if (error) setMe((p) => ({ ...p, hide_grades: !v }));
    },
    [me.id],
  );

  const { isRevealed, reveal, revealAll, allRevealed, wasJustRevealed } = revealedState;

  // Eigene Bewertung deckt automatisch auf (siehe DECISIONS.md)
  const isHidden = useCallback(
    (beerId: string) => me.hide_grades && !isRevealed(beerId) && !stats.get(beerId)?.myRated,
    [me.hide_grades, isRevealed, stats],
  );

  const value: Ctx = {
    groupId,
    group,
    setGroup,
    role,
    isAdmin: role === "admin",
    groups,
    me,
    setMe,
    members,
    setMembers,
    profileOf,
    beers,
    beerById,
    ratings,
    stats,
    loading,
    loadError,
    refresh,
    hideGrades: me.hide_grades,
    setHideGrades,
    isHidden,
    reveal,
    revealAll,
    allRevealed,
    wasJustRevealed,
  };

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}
