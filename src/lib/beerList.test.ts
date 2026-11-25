import { describe, expect, it } from "vitest";
import { filterAndSort, type ListFilters } from "./beerList";
import type { Beer, Serving } from "./types";

function beer(id: string, name: string, created: string, extra: Partial<Beer> = {}): Beer {
  return {
    id,
    name,
    brewery: null,
    style: null,
    abv: null,
    country: null,
    photo_path: null,
    barcode: null,
    catalog_id: null,
    created_by: "u",
    created_at: created,
    updated_at: created,
    deleted_at: null,
    ...extra,
  };
}

const beers = [
  beer("a", "Augustiner", "2026-01-01", { style: "Helles" }),
  beer("b", "Bitburger", "2026-01-03", { style: "Pils" }),
  beer("c", "Corona", "2026-01-02"),
  beer("d", "Duckstein", "2026-01-04"),
  beer("l", "Löwenbräu", "2026-01-05", { brewery: "Löwenbräu" }),
];

const st = (avg: number | null, count: number, servings: Serving[] = [], raters: string[] = [], myRated = false) => ({
  avg,
  count,
  servings,
  raters,
  myRated,
});

const stats = new Map([
  ["a", st(1.0, 3, ["tap"], ["me", "x"], true)],
  ["b", st(1.0, 1, ["can"], ["x"])],
  ["c", st(4.0, 2, ["bottle"], ["x"])],
  ["d", st(null, 0)],
  ["l", st(2.0, 1, ["bottle"], ["me"], true)],
]);

const base: ListFilters = { q: "", sort: "best", servings: [], style: null, mine: null, by: null };
const ids = (f: Partial<ListFilters>) => filterAndSort(beers, stats, { ...base, ...f }).map((b) => b.id);

describe("filterAndSort", () => {
  it("Beste Note: Gleichstand → mehr Bewertungen, Unbewertete ans Ende", () => {
    expect(ids({ sort: "best" })).toEqual(["a", "b", "l", "c", "d"]);
  });
  it("Schlechteste: Unbewertete trotzdem am Ende", () => {
    expect(ids({ sort: "worst" })).toEqual(["c", "l", "a", "b", "d"]);
  });
  it("A–Z / Z–A", () => {
    expect(ids({ sort: "az" })).toEqual(["a", "b", "c", "d", "l"]);
    expect(ids({ sort: "za" })).toEqual(["l", "d", "c", "b", "a"]);
  });
  it("Neueste / Meiste Bewertungen", () => {
    expect(ids({ sort: "new" })).toEqual(["l", "d", "b", "c", "a"]);
    expect(ids({ sort: "most" })).toEqual(["a", "c", "b", "l", "d"]);
  });
  it("Suche ignoriert Umlaute", () => {
    expect(ids({ q: "lowen" })).toEqual(["l"]);
  });
  it("Filter: Gebinde, Sorte, meine, bewertet von", () => {
    expect(ids({ servings: ["bottle"] })).toEqual(["l", "c"]);
    expect(ids({ style: "Pils" })).toEqual(["b"]);
    expect(ids({ mine: "rated" })).toEqual(["a", "l"]);
    expect(ids({ mine: "unrated" })).toEqual(["b", "c", "d"]);
    expect(ids({ by: "x" })).toEqual(["a", "b", "c"]);
  });
});
