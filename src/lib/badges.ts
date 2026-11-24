import type { Beer, Rating } from "./types";

export type Badge = {
  id: string;
  icon: string;
  title: string;
  description: string;
  earned: boolean;
  /** Fortschritt 0–1 für noch nicht erreichte Abzeichen */
  progress: number;
  /** z. B. "7 / 10" */
  progressLabel?: string;
};

type Def = {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** aktueller Wert und Zielwert */
  measure: (ctx: Ctx) => { value: number; target: number };
};

type Ctx = {
  mine: Rating[];
  beersCreated: number;
  countries: number;
  servings: number;
  avg: number | null;
  comments: number;
  firstRatings: number;
  styles: number;
};

const DEFS: Def[] = [
  { id: "first", icon: "🍺", title: "Erste Runde", description: "Dein erstes Bier bewertet", measure: (c) => ({ value: c.mine.length, target: 1 }) },
  { id: "ten", icon: "🔟", title: "Stammgast", description: "10 Bewertungen abgegeben", measure: (c) => ({ value: c.mine.length, target: 10 }) },
  { id: "fifty", icon: "🏅", title: "Halbes Hundert", description: "50 Bewertungen abgegeben", measure: (c) => ({ value: c.mine.length, target: 50 }) },
  { id: "allround", icon: "🎪", title: "Allrounder", description: "Dose, Flasche und gezapft bewertet", measure: (c) => ({ value: c.servings, target: 3 }) },
  { id: "explorer", icon: "🧭", title: "Entdecker", description: "5 neue Biere in die Gruppe gebracht", measure: (c) => ({ value: c.beersCreated, target: 5 }) },
  { id: "world", icon: "🌍", title: "Weltenbummler", description: "Biere aus 3 Ländern bewertet", measure: (c) => ({ value: c.countries, target: 3 }) },
  { id: "styles", icon: "🎨", title: "Sortenkenner", description: "5 verschiedene Sorten bewertet", measure: (c) => ({ value: c.styles, target: 5 }) },
  { id: "pioneer", icon: "🚩", title: "Vorkoster", description: "5 Biere als Erste/r bewertet", measure: (c) => ({ value: c.firstRatings, target: 5 }) },
  { id: "critic", icon: "📝", title: "Feuilleton", description: "10 Bewertungen mit Kommentar", measure: (c) => ({ value: c.comments, target: 10 }) },
  {
    id: "star",
    icon: "🌟",
    title: "Einserkandidat",
    description: "Einmal die Bestnote 1+ vergeben",
    measure: (c) => ({ value: c.mine.some((r) => r.grade <= 0.7) ? 1 : 0, target: 1 }),
  },
  {
    id: "brave",
    icon: "💀",
    title: "Mutprobe",
    description: "Einmal eine glatte 6 vergeben",
    measure: (c) => ({ value: c.mine.some((r) => r.grade >= 6) ? 1 : 0, target: 1 }),
  },
  {
    id: "mild",
    icon: "😇",
    title: "Gnädiger Lehrer",
    description: "Ø besser als 2,0 bei mindestens 5 Bewertungen",
    measure: (c) => ({ value: c.mine.length >= 5 && c.avg !== null && c.avg < 2 ? 1 : 0, target: 1 }),
  },
  {
    id: "strict",
    icon: "🧐",
    title: "Strenger Prüfer",
    description: "Ø schlechter als 4,0 bei mindestens 5 Bewertungen",
    measure: (c) => ({ value: c.mine.length >= 5 && c.avg !== null && c.avg > 4 ? 1 : 0, target: 1 }),
  },
];

/** Abzeichen einer Person – berechnet aus den (nicht gelöschten) Bewertungen und Bieren einer Gruppe. */
export function computeBadges(userId: string, ratings: Rating[], beers: Beer[]): Badge[] {
  const active = ratings.filter((r) => !r.deleted_at);
  const mine = active.filter((r) => r.user_id === userId);
  const beerById = new Map(beers.map((b) => [b.id, b]));
  const myBeers = [...new Set(mine.map((r) => r.beer_id))].map((id) => beerById.get(id)).filter(Boolean) as Beer[];

  // Wer hat jedes Bier zuerst bewertet?
  const firstByBeer = new Map<string, Rating>();
  for (const r of active) {
    const cur = firstByBeer.get(r.beer_id);
    if (!cur || r.created_at < cur.created_at) firstByBeer.set(r.beer_id, r);
  }

  const ctx: Ctx = {
    mine,
    beersCreated: beers.filter((b) => b.created_by === userId && !b.deleted_at).length,
    countries: new Set(myBeers.map((b) => b.country?.trim().toLowerCase()).filter(Boolean)).size,
    styles: new Set(myBeers.map((b) => b.style?.trim().toLowerCase()).filter(Boolean)).size,
    servings: new Set(mine.map((r) => r.serving)).size,
    avg: mine.length ? mine.reduce((s, r) => s + Number(r.grade), 0) / mine.length : null,
    comments: mine.filter((r) => r.comment && r.comment.trim()).length,
    firstRatings: [...firstByBeer.values()].filter((r) => r.user_id === userId).length,
  };

  return DEFS.map((d) => {
    const { value, target } = d.measure(ctx);
    const earned = value >= target;
    return {
      id: d.id,
      icon: d.icon,
      title: d.title,
      description: d.description,
      earned,
      progress: Math.min(1, value / target),
      progressLabel: target > 1 && !earned ? `${value} / ${target}` : undefined,
    };
  });
}
