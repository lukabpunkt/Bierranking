import type { Beer, Serving } from "./types";
import { matchesQuery } from "./search";

export type SortKey = "best" | "worst" | "az" | "za" | "new" | "most";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "best", label: "Beste Note" },
  { key: "worst", label: "Schlechteste" },
  { key: "az", label: "A–Z" },
  { key: "za", label: "Z–A" },
  { key: "new", label: "Neueste" },
  { key: "most", label: "Meiste Bewertungen" },
];

export type ListFilters = {
  q: string;
  sort: SortKey;
  servings: Serving[];
  style: string | null;
  mine: "rated" | "unrated" | null;
  by: string | null;
};

type StatsLike = { avg: number | null; count: number; servings: Serving[]; raters: string[]; myRated: boolean };

const byName = (a: Beer, b: Beer) => a.name.localeCompare(b.name, "de", { sensitivity: "base" });

export function filterAndSort(beers: Beer[], stats: Map<string, StatsLike>, f: ListFilters): Beer[] {
  const list = beers.filter((b) => {
    const s = stats.get(b.id);
    if (!matchesQuery(b, f.q)) return false;
    if (f.servings.length && !f.servings.some((x) => s?.servings.includes(x))) return false;
    if (f.style && (b.style ?? "") !== f.style) return false;
    if (f.mine === "rated" && !s?.myRated) return false;
    if (f.mine === "unrated" && s?.myRated) return false;
    if (f.by && !s?.raters.includes(f.by)) return false;
    return true;
  });

  const avg = (b: Beer) => stats.get(b.id)?.avg ?? null;
  const count = (b: Beer) => stats.get(b.id)?.count ?? 0;

  const byGrade = (dir: 1 | -1) => (a: Beer, b: Beer) => {
    const x = avg(a);
    const y = avg(b);
    // Unbewertete immer ans Ende
    if (x === null && y === null) return byName(a, b);
    if (x === null) return 1;
    if (y === null) return -1;
    const diff = (x - y) * dir;
    if (Math.abs(diff) > 1e-9) return diff;
    // Gleichstand: mehr Bewertungen gewinnt, dann A–Z
    return count(b) - count(a) || byName(a, b);
  };

  const sorters: Record<SortKey, (a: Beer, b: Beer) => number> = {
    best: byGrade(1),
    worst: byGrade(-1),
    az: byName,
    za: (a, b) => byName(b, a),
    new: (a, b) => b.created_at.localeCompare(a.created_at) || byName(a, b),
    most: (a, b) => count(b) - count(a) || byName(a, b),
  };

  return list.sort(sorters[f.sort]);
}
