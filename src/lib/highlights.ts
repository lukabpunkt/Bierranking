import type { Beer, Member, Rating } from "./types";

type StatsLike = { avg: number | null; count: number };

export type Ranked = { beer: Beer; avg: number; count: number };

/**
 * Hall of Fame / Shame: Biere mit den besten bzw. schlechtesten Durchschnitten.
 * Mindestanzahl an Bewertungen, damit ein einzelner Ausreißer nicht gleich ganz oben steht.
 * Bei Gleichstand gewinnt das Bier mit mehr Bewertungen, dann A–Z.
 */
export function hallOf(
  kind: "fame" | "shame",
  beers: Beer[],
  stats: Map<string, StatsLike>,
  { minRatings = 2, limit = 5 } = {},
): Ranked[] {
  const list = beers
    .map((beer) => ({ beer, avg: stats.get(beer.id)?.avg ?? null, count: stats.get(beer.id)?.count ?? 0 }))
    .filter((x): x is Ranked => x.avg !== null && x.count >= minRatings);
  const dir = kind === "fame" ? 1 : -1;
  return list
    .sort((a, b) => (a.avg - b.avg) * dir || b.count - a.count || a.beer.name.localeCompare(b.beer.name, "de"))
    .slice(0, limit);
}

/** Wählt die Mindestanzahl so, dass es bei kleinen Gruppen trotzdem eine Liste gibt. */
export function sensibleMinRatings(stats: Map<string, StatsLike>): number {
  const withTwo = [...stats.values()].filter((s) => s.count >= 2).length;
  return withTwo >= 3 ? 2 : 1;
}

export type FeedItem =
  | { kind: "rating"; at: string; userId: string; beerId: string; rating: Rating; updated: boolean }
  | { kind: "beer"; at: string; userId: string; beerId: string }
  | { kind: "join"; at: string; userId: string };

/** Aktivitäts-Feed: neueste Ereignisse zuerst. */
export function buildFeed(beers: Beer[], ratings: Rating[], members: Member[], limit = 60): FeedItem[] {
  const beerIds = new Set(beers.map((b) => b.id));
  const items: FeedItem[] = [];
  for (const r of ratings) {
    if (r.deleted_at || !beerIds.has(r.beer_id)) continue;
    // Bearbeitet = mehr als eine Minute nach dem Anlegen geändert
    const updated = new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() > 60_000;
    items.push({ kind: "rating", at: r.updated_at, userId: r.user_id, beerId: r.beer_id, rating: r, updated });
  }
  // Biere sind gruppenübergreifend → „neu angelegt“ nur zeigen, wenn es jemand aus der Gruppe war
  const memberIds = new Set(members.map((m) => m.user_id));
  for (const b of beers)
    if (memberIds.has(b.created_by)) items.push({ kind: "beer", at: b.created_at, userId: b.created_by, beerId: b.id });
  for (const m of members) items.push({ kind: "join", at: m.joined_at, userId: m.user_id });
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

/** „vor 5 Min.“, „gestern“, „am 3. Nov.“ */
export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const diff = (now.getTime() - then.getTime()) / 1000;
  if (diff < 60) return "gerade eben";
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  if (diff < 86400 && then.getDate() === now.getDate()) return `vor ${Math.floor(diff / 3600)} Std.`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) return "gestern";
  if (diff < 7 * 86400) return `vor ${Math.ceil(diff / 86400)} Tagen`;
  return `am ${then.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`;
}
