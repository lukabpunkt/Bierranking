import { describe, expect, it } from "vitest";
import { duplicateKey, matchesQuery, normalize, rankByRelevance } from "./search";

describe("normalize", () => {
  it("ignoriert Groß-/Kleinschreibung und Umlaute", () => {
    expect(normalize("Löwenbräu")).toBe("lowenbrau");
    expect(normalize("Weißbier")).toBe("weissbier");
    expect(normalize("  ÜBER   Bier ")).toBe("uber bier");
    expect(normalize("Kölsch Café")).toBe("kolsch cafe");
  });
});

describe("matchesQuery", () => {
  const beer = { name: "Löwenbräu Original", brewery: "Löwenbräu", style: "Helles" };
  it("findet Löwenbräu bei 'löwen' und 'Lowenbrau'", () => {
    expect(matchesQuery(beer, "löwen")).toBe(true);
    expect(matchesQuery(beer, "LOWEN")).toBe(true);
    expect(matchesQuery({ name: "Lowenbrau" }, "löwen")).toBe(true);
    expect(matchesQuery(beer, "Lowenbrau")).toBe(true);
  });
  it("sucht in Brauerei und Sorte", () => {
    expect(matchesQuery({ name: "Original", brewery: "Augustiner" }, "augus")).toBe(true);
    expect(matchesQuery(beer, "helles")).toBe(true);
  });
  it("alle Wörter müssen passen", () => {
    expect(matchesQuery(beer, "löwen helles")).toBe(true);
    expect(matchesQuery(beer, "löwen weizen")).toBe(false);
  });
  it("leere Suche passt immer", () => {
    expect(matchesQuery(beer, "")).toBe(true);
  });
});

describe("rankByRelevance", () => {
  it("sortiert Namensanfang vor Teiltreffer", () => {
    const items = [{ name: "Paulaner Hefe" }, { name: "Hefeweizen" }, { name: "Pils" }];
    expect(rankByRelevance(items, "hefe").map((i) => i.name)).toEqual(["Hefeweizen", "Paulaner Hefe"]);
  });
});

describe("duplicateKey", () => {
  it("entspricht lower(name) + lower(brewery)", () => {
    expect(duplicateKey("Tegernseer Hell", "Tegernsee")).toBe(duplicateKey("TEGERNSEER hell ", "tegernsee"));
    expect(duplicateKey("A", null)).toBe(duplicateKey("a", ""));
  });
});
