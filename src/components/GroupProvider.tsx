"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { average } from "@/lib/grades";
import type { Beer, Group, Member, Profile, Rating, Role, Serving, WishlistEntry } from "@/lib/types";
import { unknownProfile } from "@/lib/types";
import { useSession, type MyGroup } from "./SessionProvider";
import { useRevealed } from "@/hooks/useRevealed";
import { rememberGroup } from "@/lib/lastGroup";
import { useToast } from "./Toast";

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
  /** Nach Änderungen an der Gruppe (Name, Code) die Gruppenliste neu laden. */
  setGroup: (g?: Group) => void;
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
  /** Wunschliste aller Mitglieder dieser Gruppe */
  wishlist: WishlistEntry[];
  isWished: (beerId: string) => boolean;
  toggleWish: (beerId: string) => Promise<void>;
  /** Signierte URLs der Etikett-Fotos (beerId → URL) */
  photoUrls: Map<string, string>;
  /** true, solange die Live-Verbindung steht */
  live: boolean;
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

/**
 * Daten einer Gruppe (Mitglieder, Biere, Bewertungen) für alle Seiten darunter.
 * `group` = null ist erlaubt (z. B. /me ohne Gruppe). Profil + Gruppenliste kommen aus der Session.
 */
export function GroupProvider({ group: groupProp, children }: { group: MyGroup | null; children: React.ReactNode }) {
  const session = useSession();
  const groups = session.groups;
  const groupId = groupProp?.id ?? null;
  const role = groupProp?.role ?? null;
  const group: Group | null = groupProp;
  const me = session.profile!;
  const setMe = session.setProfile;
  const setGroup = useCallback(() => void session.reloadGroups(), [session]);
  const [members, setMembers] = useState<Member[]>([]);
  const [beers, setBeers] = useState<Beer[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [live, setLive] = useState(false);
  const toast = useToast();
  const [loading, setLoading] = useState(!!groupId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const revealedState = useRevealed(groupId);
  const loadSeq = useRef(0);

  const refresh = useCallback(async () => {
    if (!groupId) return;
    const seq = ++loadSeq.current;
    const supabase = createClient();
    try {
      // 1) Mitglieder der Gruppe
      const memberRows = await fetchAll((from, to) =>
        supabase
          .from("group_members")
          .select("user_id, role, joined_at, profiles(*)")
          .eq("group_id", groupId)
          .range(from, to),
      );
      const memberIds = memberRows.map((m) => m.user_id);

      // 2) Bewertungen + Wunschlisten dieser Personen (gehören der Person, nicht der Gruppe)
      //    und Biere, die sie angelegt haben
      const [ratingRows, wishRows, createdRows] = await Promise.all([
        fetchAll((from, to) =>
          supabase
            .from("ratings")
            .select("*")
            .in("user_id", memberIds)
            .is("deleted_at", null)
            .order("created_at")
            .range(from, to),
        ),
        fetchAll((from, to) => supabase.from("wishlist").select("*").in("user_id", memberIds).range(from, to)),
        fetchAll((from, to) =>
          supabase
            .from("beers")
            .select("*")
            .in("created_by", memberIds)
            .is("deleted_at", null)
            .range(from, to),
        ),
      ]);

      // 3) Alle Biere, die in dieser Gruppe vorkommen (in Häppchen, damit die URL kurz bleibt)
      const known = new Map(createdRows.map((b) => [b.id, b]));
      const missing = [...new Set([...ratingRows.map((r) => r.beer_id), ...wishRows.map((w) => w.beer_id)])].filter(
        (id) => !known.has(id),
      );
      for (let i = 0; i < missing.length; i += 150) {
        const { data, error } = await supabase
          .from("beers")
          .select("*")
          .in("id", missing.slice(i, i + 150))
          .is("deleted_at", null);
        if (error) throw new Error(error.message);
        for (const b of data ?? []) known.set(b.id, b);
      }
      const beerRows = [...known.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
      const beerIds = new Set(beerRows.map((b) => b.id));

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
        ratingRows.filter((r) => beerIds.has(r.beer_id)).map((r) => ({ ...r, grade: Number(r.grade) }) as Rating),
      );
      setWishlist(
        wishRows
          .filter((w) => beerIds.has(w.beer_id))
          .map((w) => ({ beer_id: w.beer_id, user_id: w.user_id, created_at: w.created_at })),
      );
      // Etikett-Fotos: signierte URLs (1 Std. gültig) für alle Biere mit Foto
      const withPhoto = beerRows.filter((b) => b.photo_path);
      if (withPhoto.length) {
        const { data: signed } = await supabase.storage
          .from("beer-photos")
          .createSignedUrls(withPhoto.map((b) => b.photo_path!), 3600);
        if (seq === loadSeq.current) {
          const map = new Map<string, string>();
          withPhoto.forEach((b, i) => {
            const url = signed?.[i]?.signedUrl;
            // updated_at als Cache-Bremse, damit ein ersetztes Foto sofort neu geladen wird
            if (url) map.set(b.id, `${url}&v=${encodeURIComponent(b.updated_at)}`);
          });
          setPhotoUrls(map);
        }
      } else {
        setPhotoUrls(new Map());
      }
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

  // Live-Updates: Änderungen anderer erscheinen ohne Neuladen.
  // Realtime liefert nur Zeilen, die man laut RLS sehen darf; danach wird einfach neu geladen.
  const membersRef = useRef<Member[]>([]);
  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    if (!groupId) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 400);
    };
    const channel = supabase
      .channel(`group-${groupId}`)
      // Biere sind ein gemeinsamer Katalog → ohne Filter (selten, harmlos)
      .on("postgres_changes", { event: "*", schema: "public", table: "beers" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "wishlist" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "ratings" }, (payload) => {
        schedule();
        const row = payload.new as Partial<Rating> | undefined;
        if (payload.eventType === "INSERT" && row?.user_id && row.user_id !== me.id) {
          const who = membersRef.current.find((m) => m.user_id === row.user_id)?.profile;
          if (who) toast({ message: `${who.emoji} ${who.display_name} hat gerade ein Bier bewertet` });
        }
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [groupId, refresh, me.id, toast]);

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
      setMe({ ...me, hide_grades: v });
      const { error } = await createClient().from("profiles").update({ hide_grades: v }).eq("id", me.id);
      if (error) setMe({ ...me, hide_grades: !v });
    },
    [me, setMe],
  );

  const { isRevealed, reveal, revealAll, allRevealed, wasJustRevealed } = revealedState;

  // Eigene Bewertung deckt automatisch auf (siehe DECISIONS.md)
  const isHidden = useCallback(
    (beerId: string) => me.hide_grades && !isRevealed(beerId) && !stats.get(beerId)?.myRated,
    [me.hide_grades, isRevealed, stats],
  );

  const isWished = useCallback(
    (beerId: string) => wishlist.some((w) => w.beer_id === beerId && w.user_id === me.id),
    [wishlist, me.id],
  );

  const toggleWish = useCallback(
    async (beerId: string) => {
      const supabase = createClient();
      if (isWished(beerId)) {
        setWishlist((w) => w.filter((x) => !(x.beer_id === beerId && x.user_id === me.id)));
        const { error } = await supabase.from("wishlist").delete().eq("beer_id", beerId).eq("user_id", me.id);
        if (error) await refresh();
      } else {
        setWishlist((w) => [...w, { beer_id: beerId, user_id: me.id, created_at: new Date().toISOString() }]);
        const { error } = await supabase.from("wishlist").insert({ beer_id: beerId, user_id: me.id });
        if (error) await refresh();
      }
    },
    [isWished, me.id, refresh],
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
    wishlist,
    isWished,
    toggleWish,
    photoUrls,
    live,
  };

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}
