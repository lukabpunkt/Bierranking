"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { buildFeed, hallOf, relativeTime, sensibleMinRatings, type FeedItem } from "@/lib/highlights";
import { computeBadges } from "@/lib/badges";
import { formatAvg } from "@/lib/grades";
import { servingInfo } from "@/lib/servings";
import { groupHref } from "@/lib/paths";
import { useGroup } from "@/components/GroupProvider";
import { Avatar } from "@/components/Avatar";
import { GradeBadge } from "@/components/GradeBadge";
import { SkeletonList } from "@/components/Skeleton";
import { Card, Chip, EmptyState } from "@/components/ui";
import { BadgeGrid } from "@/components/BadgeGrid";

type Tab = "feed" | "fame" | "shame" | "badges";
const TABS: [Tab, string][] = [
  ["feed", "Aktivität"],
  ["fame", "Hall of Fame"],
  ["shame", "Hall of Shame"],
  ["badges", "Abzeichen"],
];

function Highlights() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = (TABS.find(([t]) => t === params.get("tab"))?.[0] ?? "feed") as Tab;
  const { loading, members } = useGroup();

  function setTab(t: Tab) {
    const next = new URLSearchParams(window.location.search);
    next.set("tab", t);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Highlights</h1>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Ansicht">
        {TABS.map(([t, label]) => (
          <Chip key={t} role="tab" aria-selected={tab === t} active={tab === t} onClick={() => setTab(t)}>
            {label}
          </Chip>
        ))}
      </div>
      {loading ? (
        <SkeletonList count={4} />
      ) : tab === "feed" ? (
        <Feed />
      ) : tab === "badges" ? (
        <Badges key={members.length} />
      ) : (
        <Hall kind={tab} />
      )}
    </div>
  );
}

function Feed() {
  const { beers, ratings, members, beerById, profileOf, groupId, isHidden, reveal, me } = useGroup();
  const feed = useMemo(() => buildFeed(beers, ratings, members), [beers, ratings, members]);
  if (feed.length === 0) return <EmptyState emoji="🦗" title="Noch ist es ruhig hier." />;

  const line = (item: FeedItem) => {
    const who = profileOf(item.userId);
    const name = item.userId === me.id ? "Du" : who.display_name;
    if (item.kind === "join") return <>{name} {item.userId === me.id ? "bist" : "ist"} der Gruppe beigetreten 👋</>;
    const beer = beerById.get(item.beerId);
    const beerLink = (
      <Link href={groupHref(groupId!, "beer", { beer: item.beerId })} className="font-semibold underline-offset-2 hover:underline">
        {beer?.name ?? "?"}
      </Link>
    );
    if (item.kind === "beer")
      return (
        <>
          {name} {item.userId === me.id ? "hast" : "hat"} {beerLink} neu angelegt
        </>
      );
    return (
      <>
        {name} {item.userId === me.id ? "hast" : "hat"} {beerLink} {item.updated ? "neu bewertet" : "bewertet"}{" "}
        <span aria-label={servingInfo(item.rating.serving).label}>{servingInfo(item.rating.serving).icon}</span>
      </>
    );
  };

  return (
    <ul className="space-y-2">
      {feed.map((item, i) => (
        <li key={`${item.kind}-${item.at}-${i}`} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
          <Avatar profile={profileOf(item.userId)} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-snug">{line(item)}</p>
            <p className="text-xs text-muted">{relativeTime(item.at)}</p>
          </div>
          {item.kind === "rating" && (
            <GradeBadge
              value={item.rating.grade}
              size="sm"
              hidden={item.userId !== me.id && isHidden(item.beerId)}
              onReveal={() => reveal(item.beerId)}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function Hall({ kind }: { kind: "fame" | "shame" }) {
  const { beers, stats, groupId, isHidden, reveal, wasJustRevealed } = useGroup();
  const min = sensibleMinRatings(stats);
  const list = hallOf(kind, beers, stats, { minRatings: min, limit: 10 });
  const medals = kind === "fame" ? ["🥇", "🥈", "🥉"] : ["🫗", "🥴", "🤢"];

  if (list.length === 0)
    return <EmptyState emoji={kind === "fame" ? "🏆" : "🙈"} title={`Noch zu wenige Bewertungen (ab ${min} pro Bier).`} />;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        {kind === "fame" ? "Die besten Biere der Gruppe" : "Die Biere, die durchgefallen sind"} · ab {min}{" "}
        {min === 1 ? "Bewertung" : "Bewertungen"}
      </p>
      <ol className="space-y-2">
        {list.map((r, i) => (
          <li key={r.beer.id}>
            <Link
              href={groupHref(groupId!, "beer", { beer: r.beer.id })}
              className={`flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm hover:bg-card-2 ${i === 0 ? "ring-2 ring-accent" : ""}`}
            >
              <span className="tabular w-8 text-center text-2xl" aria-label={`Platz ${i + 1}`}>
                {medals[i] ?? `${i + 1}.`}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{r.beer.name}</span>
                <span className="block truncate text-sm text-muted">
                  {[r.beer.brewery, `${r.count} ${r.count === 1 ? "Bewertung" : "Bewertungen"}`].filter(Boolean).join(" · ")}
                </span>
              </span>
              <GradeBadge
                value={r.avg}
                size="md"
                hidden={isHidden(r.beer.id)}
                onReveal={() => reveal(r.beer.id)}
                animate={wasJustRevealed(r.beer.id)}
              />
              {!isHidden(r.beer.id) && <span className="sr-only">Durchschnitt {formatAvg(r.avg)}</span>}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Badges() {
  const { members, ratings, beers, me, profileOf } = useGroup();
  const [person, setPerson] = useState(me.id);
  const badges = useMemo(() => computeBadges(person, ratings, beers), [person, ratings, beers]);
  const earned = badges.filter((b) => b.earned).length;
  const p = profileOf(person);

  return (
    <div className="space-y-4">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Person">
        {members.map((m) => (
          <Chip key={m.user_id} active={person === m.user_id} onClick={() => setPerson(m.user_id)} className="pl-1.5">
            <Avatar profile={m.profile} size="xs" /> {m.user_id === me.id ? "Ich" : m.profile.display_name}
          </Chip>
        ))}
      </div>
      <Card className="flex items-center gap-3">
        <Avatar profile={p} size="md" />
        <p className="font-semibold">
          {person === me.id ? "Du hast" : `${p.display_name} hat`} {earned} von {badges.length} Abzeichen
        </p>
      </Card>
      <BadgeGrid badges={badges} />
    </div>
  );
}

export default function HighlightsPage() {
  return (
    <Suspense fallback={<SkeletonList count={4} />}>
      <Highlights />
    </Suspense>
  );
}
