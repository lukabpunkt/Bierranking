"use client";

import { groupHref } from "@/lib/paths";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, LogOut, RotateCcw, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { average, formatAvg, gradeLabel } from "@/lib/grades";
import { servingInfo, SERVINGS } from "@/lib/servings";
import { downloadFile, slug, toCsv } from "@/lib/export";
import { matchesQuery } from "@/lib/search";
import { forgetGroup } from "@/lib/lastGroup";
import { friendlyError, isUniqueViolation } from "@/lib/errors";
import { useToast } from "@/components/Toast";
import { absoluteUrl } from "@/lib/paths";
import type { Beer, Rating, Serving } from "@/lib/types";
import { useGroup } from "@/components/GroupProvider";
import { ProfileForm } from "@/components/ProfileForm";
import { PasswordForm } from "@/components/PasswordForm";
import { BadgeGrid } from "@/components/BadgeGrid";
import { computeBadges } from "@/lib/badges";
import { GradeBadge } from "@/components/GradeBadge";
import { Button, Card, Chip, Switch, inputClass } from "@/components/ui";
import { SkeletonBlock } from "@/components/Skeleton";

type MyRating = Rating & { beer: Pick<Beer, "id" | "name" | "brewery" | "style" | "abv" | "country"> };
type MySort = "date" | "best" | "worst" | "name";

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
}

export function MeClient({ email }: { email: string }) {
  const { me, setMe, group, groupId, members, beers, ratings, loading, hideGrades, setHideGrades, refresh } = useGroup();
  const toast = useToast();
  const [allMine, setAllMine] = useState<MyRating[] | null>(null);
  const [trash, setTrash] = useState<Beer[] | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<MySort>("date");

  // Meine Bewertungen – sie gehören mir und gelten in allen Gruppen gleich
  useEffect(() => {
    createClient()
      .from("ratings")
      .select("*, beer:beers!inner(id, name, brewery, style, abv, country, deleted_at)")
      .eq("user_id", me.id)
      .is("deleted_at", null)
      .is("beer.deleted_at", null)
      .order("rated_on", { ascending: false })
      .then(({ data }) =>
        setAllMine(((data ?? []) as unknown as MyRating[]).map((r) => ({ ...r, grade: Number(r.grade) }))),
      );
  }, [me.id, ratings]);

  // Papierkorb: von mir angelegte, gelöschte Biere
  const loadTrash = useCallback(async () => {
    const { data } = await createClient()
      .from("beers")
      .select("*")
      .eq("created_by", me.id)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    setTrash(data ?? []);
  }, [me.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Datenabruf
    void loadTrash();
  }, [loadTrash]);

  async function restore(beer: Beer) {
    const { error } = await createClient().from("beers").update({ deleted_at: null }).eq("id", beer.id);
    if (error) {
      return toast({
        message: isUniqueViolation(error) ? "Es gibt inzwischen ein Bier mit gleichem Namen." : friendlyError(error),
        tone: "error",
      });
    }
    await Promise.all([loadTrash(), refresh()]);
    toast({ message: `„${beer.name}“ wiederhergestellt` });
  }

  const mine: MyRating[] = useMemo(() => allMine ?? [], [allMine]);

  const stats = useMemo(() => {
    if (mine.length === 0) return null;
    const avg = average(mine.map((r) => r.grade))!;
    const beerCount = new Set(mine.map((r) => r.beer_id)).size;
    const favorite = mine.reduce((a, b) => (b.grade < a.grade ? b : a));
    const hated = mine.reduce((a, b) => (b.grade > a.grade ? b : a));
    const counts = SERVINGS.map((s) => ({
      s: s.value,
      n: mine.filter((r) => r.serving === s.value).length,
      avg: average(mine.filter((r) => r.serving === s.value).map((r) => r.grade)) ?? 99,
    })).sort((a, b) => b.n - a.n || a.avg - b.avg);

    let stricter: number | null = null;
    if (groupId) {
      const others = members
        .filter((m) => m.user_id !== me.id)
        .map((m) => average(ratings.filter((r) => r.user_id === m.user_id).map((r) => r.grade)))
        .filter((x): x is number => x !== null);
      if (others.length > 0) stricter = Math.round((others.filter((o) => o < avg).length / others.length) * 100);
    }
    return { avg, count: mine.length, beerCount, favorite, hated, favServing: counts[0].s as Serving, stricter };
  }, [mine, members, ratings, me.id, groupId]);

  const myBadges = useMemo(() => computeBadges(me.id, ratings, beers), [me.id, ratings, beers]);

  const list = useMemo(() => {
    const filtered = mine.filter((r) => matchesQuery(r.beer, query));
    const byName = (a: MyRating, b: MyRating) => a.beer.name.localeCompare(b.beer.name, "de");
    const sorters: Record<MySort, (a: MyRating, b: MyRating) => number> = {
      date: (a, b) => b.rated_on.localeCompare(a.rated_on) || byName(a, b),
      best: (a, b) => a.grade - b.grade || byName(a, b),
      worst: (a, b) => b.grade - a.grade || byName(a, b),
      name: byName,
    };
    return filtered.sort(sorters[sort]);
  }, [mine, query, sort]);

  function exportMine() {
    const rows = (allMine ?? []).map((r) => [
      r.beer.name,
      r.beer.brewery,
      r.beer.style,
      gradeLabel(r.grade),
      r.grade,
      servingInfo(r.serving).label,
      r.rated_on,
      r.location,
      r.comment,
    ]);
    downloadFile(
      `prost-zeugnis-${slug(me.display_name)}-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(["Bier", "Brauerei", "Sorte", "Note", "Notenwert", "Gebinde", "Datum", "Ort", "Kommentar"], rows),
      "text/csv;charset=utf-8",
    );
  }

  function exportGroup(format: "csv" | "json") {
    if (!group) return;
    const name = (id: string) => members.find((m) => m.user_id === id)?.profile.display_name ?? "Ehemalig";
    const date = new Date().toISOString().slice(0, 10);
    if (format === "csv") {
      const rows: (string | number | null)[][] = [];
      for (const b of [...beers].sort((x, y) => x.name.localeCompare(y.name, "de"))) {
        const rs = ratings.filter((r) => r.beer_id === b.id);
        const beerCols = [b.name, b.brewery, b.style, b.abv, b.country];
        if (rs.length === 0) rows.push([...beerCols, null, null, null, null, null, null, null]);
        for (const r of rs)
          rows.push([...beerCols, name(r.user_id), gradeLabel(r.grade), r.grade, servingInfo(r.serving).label, r.rated_on, r.location, r.comment]);
      }
      downloadFile(
        `prost-zeugnis-${slug(group.name)}-${date}.csv`,
        toCsv(
          ["Bier", "Brauerei", "Sorte", "Alkohol %", "Land", "Person", "Note", "Notenwert", "Gebinde", "Datum", "Ort", "Kommentar"],
          rows,
        ),
        "text/csv;charset=utf-8",
      );
    } else {
      const data = {
        group: { id: group.id, name: group.name, created_at: group.created_at },
        exported_at: new Date().toISOString(),
        members: members.map((m) => ({ id: m.user_id, name: m.profile.display_name, role: m.role, joined_at: m.joined_at })),
        beers: beers.map((b) => ({
          ...b,
          ratings: ratings
            .filter((r) => r.beer_id === b.id)
            .map((r) => ({ ...r, person: name(r.user_id), grade_label: gradeLabel(r.grade) })),
        })),
      };
      downloadFile(`prost-zeugnis-${slug(group.name)}-${date}.json`, JSON.stringify(data, null, 2), "application/json");
    }
  }

  async function signOut() {
    forgetGroup();
    await createClient().auth.signOut();
    // Harter Seitenwechsel: sonst leitet der Seitenschutz zuerst auf /login/?next=/me/ um
    window.location.replace(absoluteUrl("/login/"));
  }

  const loadingStats = allMine === null;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Ich</h1>

      <Card>
        <ProfileForm profile={me} onSaved={setMe} />
        <p className="mt-3 text-center text-sm text-muted">Angemeldet als {email}</p>
      </Card>

      <Card>
        <Switch label="Noten verdecken, bis ich sie antippe" checked={hideGrades} onChange={setHideGrades} />
        <p className="mt-1 text-sm text-muted">
          Spoiler-Schutz: Fremde Noten erst nach Antippen zeigen, damit du dich vor dem eigenen Bewerten nicht beeinflussen
          lässt. Gilt auf allen Geräten.
        </p>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">Statistik</h2>
          <p className="text-sm text-muted">Deine Bewertungen gelten in allen deinen Gruppen.</p>
        </div>

        {loadingStats ? (
          <SkeletonBlock className="h-40" />
        ) : !stats ? (
          <p className="text-muted">Noch keine Bewertungen – ab an den Kühlschrank! 🍺</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-card-2 p-3">
                <p className="tabular text-2xl font-extrabold">{stats.count}</p>
                <p className="text-xs text-muted">Bewertungen</p>
              </div>
              <div className="rounded-2xl bg-card-2 p-3">
                <p className="tabular text-2xl font-extrabold">{stats.beerCount}</p>
                <p className="text-xs text-muted">Biere</p>
              </div>
              <div className="rounded-2xl bg-card-2 p-3">
                <p className="tabular text-2xl font-extrabold">{formatAvg(stats.avg)}</p>
                <p className="text-xs text-muted">meine Ø-Note</p>
              </div>
            </div>
            {stats.stricter !== null && (
              <p className="text-center font-semibold">
                {stats.stricter >= 50
                  ? `Du bist strenger als ${stats.stricter} % von „${group?.name}“ 🧐`
                  : `Du bist milder als ${100 - stats.stricter} % von „${group?.name}“ 😇`}
              </p>
            )}
            <ul className="space-y-2">
              <li className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm whitespace-nowrap text-muted">❤️ Lieblingsbier</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{stats.favorite.beer.name}</span>
                <GradeBadge value={stats.favorite.grade} size="xs" />
              </li>
              {stats.hated.id !== stats.favorite.id && stats.hated.grade !== stats.favorite.grade && (
                <li className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-sm whitespace-nowrap text-muted">💀 Hassbier</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{stats.hated.beer.name}</span>
                  <GradeBadge value={stats.hated.grade} size="xs" />
                </li>
              )}
              <li className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm whitespace-nowrap text-muted">🏆 Lieblingsgebinde</span>
                <span className="font-semibold">
                  {servingInfo(stats.favServing).icon} {servingInfo(stats.favServing).label}
                </span>
              </li>
            </ul>
          </>
        )}
      </Card>

      {groupId && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Meine Abzeichen</h2>
            <Link
              href={groupHref(groupId, "highlights", { tab: "badges" })}
              className="inline-flex min-h-11 items-center text-sm font-semibold underline"
            >
              Alle ansehen
            </Link>
          </div>
          {loading ? <SkeletonBlock className="h-24" /> : <BadgeGrid badges={myBadges.filter((b) => b.earned).length ? myBadges.filter((b) => b.earned) : myBadges.slice(0, 4)} />}
          {!loading && myBadges.every((b) => !b.earned) && (
            <p className="text-sm text-muted">Noch keins – bewerte dein erstes Bier! 🍺</p>
          )}
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="text-lg font-bold">Meine Bewertungen</h2>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" size={18} aria-hidden />
          <input
            type="search"
            className={`${inputClass} pl-11`}
            placeholder="Durchsuchen"
            aria-label="Meine Bewertungen durchsuchen"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {(
            [
              ["date", "Neueste"],
              ["best", "Beste"],
              ["worst", "Schlechteste"],
              ["name", "A–Z"],
            ] as [MySort, string][]
          ).map(([k, l]) => (
            <Chip key={k} active={sort === k} onClick={() => setSort(k)}>
              {l}
            </Chip>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="text-muted">Keine Bewertungen gefunden.</p>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((r) => (
              <li key={r.id}>
                <Link
                  href={groupId ? groupHref(groupId, "beer", { beer: r.beer_id }) : "/groups/"}
                  className="flex min-h-14 items-center gap-3 py-2 hover:opacity-80"
                >
                  <GradeBadge value={r.grade} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.beer.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {servingInfo(r.serving).icon} {formatDate(r.rated_on)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {trash && trash.length > 0 && (
        <Card>
          <h2 className="mb-1 text-lg font-bold">Papierkorb</h2>
          <p className="mb-3 text-sm text-muted">Von dir angelegte, gelöschte Biere – samt Bewertungen wiederherstellbar.</p>
          <ul className="divide-y divide-line">
            {trash.map((b) => (
              <li key={b.id} className="flex min-h-14 items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{b.name}</p>
                  <p className="truncate text-sm text-muted">
                    {[b.brewery, b.deleted_at && `gelöscht am ${new Date(b.deleted_at).toLocaleDateString("de-DE")}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Button variant="secondary" className="min-h-11 px-3" onClick={() => restore(b)}>
                  <RotateCcw size={18} aria-hidden /> Zurück
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <PasswordForm />
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-bold">Export</h2>
        <p className="text-sm text-muted">Deine Daten gehören dir. CSV öffnet sich direkt in Excel.</p>
        <Button variant="secondary" className="w-full" onClick={exportMine} disabled={!allMine?.length}>
          <Download size={18} aria-hidden /> Meine Daten als CSV
        </Button>
        {group && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="px-3 whitespace-nowrap" onClick={() => exportGroup("csv")} disabled={loading}>
              <Download size={18} aria-hidden /> Gruppe CSV
            </Button>
            <Button variant="secondary" className="px-3 whitespace-nowrap" onClick={() => exportGroup("json")} disabled={loading}>
              <Download size={18} aria-hidden /> Gruppe JSON
            </Button>
          </div>
        )}
      </Card>

      <Button variant="ghost" className="w-full text-danger" onClick={signOut}>
        <LogOut size={18} aria-hidden /> Abmelden
      </Button>
      <p className="pb-4 text-center text-xs text-muted">
        Prost-Zeugnis · <Link href="/groups/" className="underline">Meine Gruppen</Link>
      </p>
    </div>
  );
}
