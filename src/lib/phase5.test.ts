import { describe, expect, it } from "vitest";
import { computeBadges } from "./badges";
import { buildFeed, hallOf, relativeTime, sensibleMinRatings } from "./highlights";
import { guessStyle, isValidEan, parseProduct } from "./openFoodFacts";
import type { Beer, Member, Rating, Serving } from "./types";

let n = 0;
const beer = (id: string, extra: Partial<Beer> = {}): Beer => ({
  id,
  name: id.toUpperCase(),
  group_id: "g",
  brewery: null,
  style: null,
  abv: null,
  country: null,
  photo_path: null,
  barcode: null,
  created_by: "anna",
  created_at: `2026-01-0${(n++ % 9) + 1}T10:00:00Z`,
  updated_at: "2026-01-01T10:00:00Z",
  deleted_at: null,
  ...extra,
});
const rating = (user: string, beerId: string, grade: number, serving: Serving = "bottle", at = "2026-02-01T10:00:00Z", comment: string | null = null): Rating => ({
  id: `${user}-${beerId}-${serving}`,
  user_id: user,
  beer_id: beerId,
  grade,
  serving,
  comment,
  location: null,
  rated_on: at.slice(0, 10),
  created_at: at,
  updated_at: at,
  deleted_at: null,
});

describe("Abzeichen", () => {
  const beers = [
    beer("a", { country: "Deutschland", style: "Pils" }),
    beer("b", { country: "Belgien", style: "Weizen" }),
    beer("c", { country: "Tschechien", style: "Pils", created_by: "tom" }),
  ];
  const ratings = [
    rating("anna", "a", 0.7, "can", "2026-02-01T10:00:00Z", "super"),
    rating("anna", "b", 6, "bottle", "2026-02-02T10:00:00Z"),
    rating("anna", "c", 2, "tap", "2026-02-05T10:00:00Z"),
    rating("tom", "c", 3, "tap", "2026-02-03T10:00:00Z"),
  ];
  const badges = Object.fromEntries(computeBadges("anna", ratings, beers).map((b) => [b.id, b]));

  it("vergibt erreichte Abzeichen", () => {
    expect(badges.first.earned).toBe(true);
    expect(badges.allround.earned).toBe(true); // Dose, Flasche, gezapft
    expect(badges.world.earned).toBe(true); // 3 Länder
    expect(badges.star.earned).toBe(true); // 1+
    expect(badges.brave.earned).toBe(true); // 6
  });
  it("zeigt Fortschritt für offene Abzeichen", () => {
    expect(badges.ten.earned).toBe(false);
    expect(badges.ten.progressLabel).toBe("3 / 10");
    expect(badges.explorer.progressLabel).toBe("2 / 5");
    expect(badges.styles.progressLabel).toBe("2 / 5");
  });
  it("Vorkoster zählt nur Biere, die man als Erste/r bewertet hat", () => {
    expect(badges.pioneer.progressLabel).toBe("2 / 5"); // a, b – c hat Tom zuerst bewertet
  });
  it("ignoriert gelöschte Bewertungen", () => {
    const del = { ...rating("lea", "a", 1), deleted_at: "2026-03-01" };
    expect(computeBadges("lea", [del], beers).find((b) => b.id === "first")!.earned).toBe(false);
  });
});

describe("Hall of Fame / Shame", () => {
  const beers = [beer("a"), beer("b"), beer("c"), beer("d")];
  const stats = new Map([
    ["a", { avg: 1.0, count: 3 }],
    ["b", { avg: 1.0, count: 5 }],
    ["c", { avg: 5.0, count: 2 }],
    ["d", { avg: 0.7, count: 1 }],
  ]);
  it("beste zuerst, Gleichstand: mehr Bewertungen", () => {
    expect(hallOf("fame", beers, stats).map((r) => r.beer.id)).toEqual(["b", "a", "c"]);
  });
  it("schlechteste zuerst", () => {
    expect(hallOf("shame", beers, stats).map((r) => r.beer.id)).toEqual(["c", "b", "a"]);
  });
  it("Mindestanzahl schützt vor Einzelausreißern, passt sich kleinen Gruppen an", () => {
    expect(sensibleMinRatings(stats)).toBe(2);
    expect(sensibleMinRatings(new Map([["d", { avg: 0.7, count: 1 }]]))).toBe(1);
    expect(hallOf("fame", beers, stats, { minRatings: 1 })[0].beer.id).toBe("d");
  });
});

describe("Aktivitäts-Feed", () => {
  it("sortiert neueste zuerst und erkennt Bearbeitungen", () => {
    const beers = [beer("a", { created_at: "2026-01-01T10:00:00Z" })];
    const edited = { ...rating("tom", "a", 2, "bottle", "2026-01-03T10:00:00Z"), updated_at: "2026-01-04T10:00:00Z" };
    const members: Member[] = [
      { user_id: "tom", role: "member", joined_at: "2026-01-02T10:00:00Z", profile: {} as Member["profile"] },
    ];
    const feed = buildFeed(beers, [edited], members);
    expect(feed.map((f) => f.kind)).toEqual(["rating", "join", "beer"]);
    expect(feed[0].kind === "rating" && feed[0].updated).toBe(true);
  });
  it("relative Zeitangaben", () => {
    const now = new Date("2026-05-10T12:00:00");
    expect(relativeTime("2026-05-10T11:59:30", now)).toBe("gerade eben");
    expect(relativeTime("2026-05-10T11:40:00", now)).toBe("vor 20 Min.");
    expect(relativeTime("2026-05-09T12:00:00", now)).toBe("gestern");
  });
});

describe("Open Food Facts", () => {
  it("rät die Sorte", () => {
    expect(guessStyle(["en:beers", "en:pilsner-beers"])).toBe("Pils");
    expect(guessStyle(["en:wheat-beers"])).toBe("Weizen");
    expect(guessStyle([], "Erdinger Alkoholfrei")).toBe("Alkoholfrei");
    expect(guessStyle(["en:india-pale-ale"])).toBe("IPA");
    expect(guessStyle(["en:beers"])).toBe("");
  });
  it("übersetzt ein Produkt", () => {
    const s = parseProduct("4066600641919", {
      product_name: "Original",
      brands: "Löwenbräu, AB InBev",
      categories_tags: ["en:beers", "en:lagers"],
      countries_tags: ["en:germany"],
      nutriments: { alcohol: 5.2 },
    });
    expect(s).toEqual({ barcode: "4066600641919", name: "Original", brewery: "Löwenbräu", style: "Lager", abv: "5,2", country: "Deutschland" });
  });
  it("nimmt die Marke als Name, wenn der Produktname fehlt", () => {
    expect(parseProduct("1", { brands: "Jever" }).name).toBe("Jever");
  });
  it("prüft EAN-Prüfziffern", () => {
    expect(isValidEan("4006381333931")).toBe(true);
    expect(isValidEan("4006381333932")).toBe(false);
    expect(isValidEan("96385074")).toBe(true);
    expect(isValidEan("abc")).toBe(false);
  });
});
