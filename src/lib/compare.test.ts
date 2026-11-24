import { describe, expect, it } from "vitest";
import { agreement, bestPartner, buildGradeMatrix, commonBeers, fightBeers, pairwise } from "./compare";
import type { Rating, Serving } from "./types";

let n = 0;
function r(user: string, beer: string, grade: number, serving: Serving = "bottle", deleted = false): Rating {
  return {
    id: String(n++),
    user_id: user,
    beer_id: beer,
    grade,
    serving,
    comment: null,
    location: null,
    rated_on: "2026-01-01",
    created_at: "",
    updated_at: "",
    deleted_at: deleted ? "2026-01-02" : null,
  };
}

const ratings: Rating[] = [
  r("anna", "b1", 1.0),
  r("anna", "b1", 2.0, "tap"),
  r("tom", "b1", 1.0),
  r("anna", "b2", 0.7),
  r("tom", "b2", 5.0),
  r("anna", "b3", 3.0),
  r("lea", "b3", 3.0),
  r("tom", "b4", 2.0, "bottle", true), // gelöscht
];

describe("buildGradeMatrix", () => {
  it("mittelt bei 'all' über Gebinde", () => {
    const m = buildGradeMatrix(ratings, "all");
    expect(m.get("anna")!.get("b1")).toBe(1.5);
  });
  it("filtert nach Gebinde", () => {
    const m = buildGradeMatrix(ratings, "tap");
    expect(m.get("anna")!.get("b1")).toBe(2.0);
    expect(m.get("tom")).toBeUndefined();
  });
  it("ignoriert gelöschte Bewertungen", () => {
    const m = buildGradeMatrix(ratings, "all");
    expect(m.get("tom")!.has("b4")).toBe(false);
  });
});

describe("commonBeers", () => {
  it("nur Biere, die alle bewertet haben", () => {
    const m = buildGradeMatrix(ratings, "all");
    expect(commonBeers(m, ["anna", "tom"]).sort()).toEqual(["b1", "b2"]);
    expect(commonBeers(m, ["anna", "tom", "lea"])).toEqual([]);
  });
});

describe("agreement", () => {
  it("berechnet 1 − MAD / 5,3", () => {
    const m = buildGradeMatrix(ratings, "bottle");
    // b1: |1−1| = 0, b2: |0,7−5| = 4,3 → MAD 2,15 → 1 − 2,15/5,3 = 0,594 → 59 %
    expect(agreement(m, "anna", "tom")).toEqual({ percent: 59, common: 2 });
  });
  it("identische Noten = 100 %", () => {
    const m = buildGradeMatrix(ratings, "all");
    expect(agreement(m, "anna", "lea")).toEqual({ percent: 100, common: 1 });
  });
  it("keine gemeinsamen Biere = null", () => {
    const m = buildGradeMatrix(ratings, "all");
    expect(agreement(m, "tom", "lea")).toBeNull();
  });
  it("nie negativ", () => {
    const m = buildGradeMatrix([r("x", "b", 0.7), r("y", "b", 6)], "all");
    expect(agreement(m, "x", "y")!.percent).toBe(0);
  });
});

describe("fightBeers", () => {
  it("sortiert nach Spanne absteigend", () => {
    const m = buildGradeMatrix(ratings, "all");
    const fights = fightBeers(m, ["anna", "tom"], ["b1", "b2", "b3"]);
    expect(fights.map((f) => f.beer)).toEqual(["b2", "b1"]);
    expect(fights[0].s.best.user).toBe("anna");
    expect(fights[0].s.worst.user).toBe("tom");
  });
});

describe("bestPartner / pairwise", () => {
  it("wählt die Person mit den meisten gemeinsamen Bieren", () => {
    const m = buildGradeMatrix(ratings, "all");
    expect(bestPartner(m, "anna", ["anna", "tom", "lea"])).toBe("tom");
  });
  it("findet Geschmackszwillinge", () => {
    const m = buildGradeMatrix(ratings, "all");
    const { twins } = pairwise(m, ["anna", "tom", "lea"]);
    expect(twins).toMatchObject({ a: "anna", b: "lea" });
  });
});
