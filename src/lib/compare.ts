import type { Rating, Serving } from "./types";

export type ServingFilter = "all" | Serving;

/** userId → beerId → Note (bei "all": Durchschnitt über die Gebinde). */
export type GradeMatrix = Map<string, Map<string, number>>;

export function buildGradeMatrix(ratings: Rating[], serving: ServingFilter): GradeMatrix {
  const acc = new Map<string, Map<string, number[]>>();
  for (const r of ratings) {
    if (r.deleted_at) continue;
    if (serving !== "all" && r.serving !== serving) continue;
    let byBeer = acc.get(r.user_id);
    if (!byBeer) acc.set(r.user_id, (byBeer = new Map()));
    const list = byBeer.get(r.beer_id) ?? [];
    list.push(Number(r.grade));
    byBeer.set(r.beer_id, list);
  }
  const out: GradeMatrix = new Map();
  for (const [user, byBeer] of acc) {
    const m = new Map<string, number>();
    for (const [beer, list] of byBeer) m.set(beer, list.reduce((a, b) => a + b, 0) / list.length);
    out.set(user, m);
  }
  return out;
}

/** Biere, die alle angegebenen Personen bewertet haben. */
export function commonBeers(matrix: GradeMatrix, users: string[]): string[] {
  if (users.length === 0) return [];
  const [first, ...rest] = users;
  const base = matrix.get(first);
  if (!base) return [];
  return [...base.keys()].filter((beer) => rest.every((u) => matrix.get(u)?.has(beer)));
}

export type Agreement = { percent: number; common: number };

/** Übereinstimmung = max(0, 1 − mittlere absolute Differenz / 5,3) × 100, gerundet. */
export function agreement(matrix: GradeMatrix, a: string, b: string): Agreement | null {
  const beers = commonBeers(matrix, [a, b]);
  if (beers.length === 0) return null;
  const ma = matrix.get(a)!;
  const mb = matrix.get(b)!;
  const mad = beers.reduce((sum, beer) => sum + Math.abs(ma.get(beer)! - mb.get(beer)!), 0) / beers.length;
  return { percent: Math.round(Math.max(0, 1 - mad / 5.3) * 100), common: beers.length };
}

/** Spanne (max − min) der Noten der angegebenen Personen für ein Bier, nur wer bewertet hat. */
export function spread(matrix: GradeMatrix, users: string[], beer: string) {
  const entries = users
    .map((u) => ({ user: u, grade: matrix.get(u)?.get(beer) }))
    .filter((e): e is { user: string; grade: number } => e.grade !== undefined);
  if (entries.length < 2) return null;
  const best = entries.reduce((a, b) => (b.grade < a.grade ? b : a));
  const worst = entries.reduce((a, b) => (b.grade > a.grade ? b : a));
  return { spread: worst.grade - best.grade, best, worst, count: entries.length };
}

/** Streitbiere: größte Spanne zuerst (nur Spanne > 0). */
export function fightBeers(matrix: GradeMatrix, users: string[], beers: string[]) {
  return beers
    .map((beer) => ({ beer, s: spread(matrix, users, beer) }))
    .filter((x): x is { beer: string; s: NonNullable<ReturnType<typeof spread>> } => !!x.s && x.s.spread > 0.001)
    .sort((a, b) => b.s.spread - a.s.spread);
}

/** Person mit den meisten gemeinsamen Bewertungen (außer man selbst). */
export function bestPartner(matrix: GradeMatrix, me: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const c of candidates) {
    if (c === me) continue;
    const n = commonBeers(matrix, [me, c]).length;
    if (n > bestCount) {
      best = c;
      bestCount = n;
    }
  }
  return best ?? candidates.find((c) => c !== me) ?? null;
}

/** Paarweise Übereinstimmung für ≥ 3 Personen. */
export function pairwise(matrix: GradeMatrix, users: string[]) {
  const pairs: { a: string; b: string; result: Agreement | null }[] = [];
  for (let i = 0; i < users.length; i++)
    for (let j = i + 1; j < users.length; j++)
      pairs.push({ a: users[i], b: users[j], result: agreement(matrix, users[i], users[j]) });
  const twins = pairs
    .filter((p) => p.result)
    .sort((x, y) => y.result!.percent - x.result!.percent || y.result!.common - x.result!.common)[0];
  return { pairs, twins: twins ?? null };
}
