"use client";

import { groupHref } from "@/lib/paths";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import type { Beer } from "@/lib/types";
import { servingInfo } from "@/lib/servings";
import { GradeBadge } from "./GradeBadge";
import { AvatarStack } from "./Avatar";
import { useGroup, type BeerStats } from "./GroupProvider";

export function BeerCard({ beer, stats }: { beer: Beer; stats: BeerStats | undefined }) {
  const { groupId, isHidden, reveal, profileOf, wasJustRevealed, photoUrls, isWished } = useGroup();
  const photo = photoUrls.get(beer.id);
  const wished = isWished(beer.id);
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
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- signierte Storage-URL
        <img src={photo} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" loading="lazy" />
      )}
      {wished && (
        <Bookmark
          size={16}
          className="absolute right-3 bottom-3 fill-accent text-accent-strong"
          aria-label="Auf deiner Wunschliste"
        />
      )}
      {!stats?.myRated && (
        <span
          className="absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-card"
          aria-label="Von dir noch nicht bewertet"
        />
      )}
    </Link>
  );
}
