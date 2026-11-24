"use client";

import { groupHref } from "@/lib/paths";
import Link from "next/link";
import type { Beer } from "@/lib/types";
import { servingInfo } from "@/lib/servings";
import { GradeBadge } from "./GradeBadge";
import { AvatarStack } from "./Avatar";
import { useGroup, type BeerStats } from "./GroupProvider";

export function BeerCard({ beer, stats }: { beer: Beer; stats: BeerStats | undefined }) {
  const { groupId, isHidden, reveal, profileOf, wasJustRevealed } = useGroup();
  const hidden = isHidden(beer.id);
  const sub = [beer.brewery, beer.style].filter(Boolean).join(" · ");
  const count = stats?.count ?? 0;

  return (
    <Link
      href={groupHref(groupId!, "beer", { beer: beer.id })}
      className="relative flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm transition hover:bg-card-2 active:scale-[0.99]"
    >
      <GradeBadge
        value={stats?.avg ?? null}
        size="lg"
        showAvg
        hidden={hidden && count > 0}
        onReveal={() => reveal(beer.id)}
        animate={wasJustRevealed(beer.id)}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-bold leading-tight">{beer.name}</p>
        {sub && <p className="truncate text-sm text-muted">{sub}</p>}
        <div className="mt-1.5 flex items-center gap-2 text-sm text-muted">
          {stats && stats.servings.length > 0 && (
            <span className="flex gap-0.5" aria-label={`Gebinde: ${stats.servings.map((s) => servingInfo(s).label).join(", ")}`}>
              {stats.servings.map((s) => (
                <span key={s} aria-hidden>
                  {servingInfo(s).icon}
                </span>
              ))}
            </span>
          )}
          {stats && stats.raters.length > 0 && <AvatarStack profiles={stats.raters.map(profileOf)} />}
          <span className="tabular">
            {count === 0 ? "noch unbewertet" : `${count} ${count === 1 ? "Bewertung" : "Bewertungen"}`}
          </span>
        </div>
      </div>
      {!stats?.myRated && (
        <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-accent" aria-label="Von dir noch nicht bewertet" />
      )}
    </Link>
  );
}
