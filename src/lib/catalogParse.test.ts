import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { catalogToSql, parseCatalog, stylesByFrequency } from "./catalogParse";
import { CATALOG_STYLES } from "./catalogStyles";

const sample = `# Titel

## Hinweise für Claude Code

1. Text ohne Tabelle

## Deutschland

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Veltins Pilsener | C. & A. Veltins | Pils | nein |
| Veltins Alkoholfrei | C. & A. Veltins | Pils | ja |
| Krombacher Weizen | Krombacher | Hefeweizen | nein |

## Belgien

| Bier | Brauerei/Marke | Sorte | Alkoholfrei |
|---|---|---|---|
| Duvel | Duvel Moortgat | Belgisches Strong Golden Ale | nein |
| duvel | Doppelt | Pils | nein |
| kaputte | Zeile |
`;

describe("parseCatalog", () => {
  const { entries, skipped } = parseCatalog(sample);
  it("liest alle Tabellenzeilen mit Land aus der Zwischenüberschrift", () => {
    expect(entries).toHaveLength(4);
    expect(entries[0]).toEqual({
      name: "Veltins Pilsener",
      brewery: "C. & A. Veltins",
      style: "Pils",
      country: "Deutschland",
      alcohol_free: false,
    });
    expect(entries[1].alcohol_free).toBe(true);
    expect(entries[3].country).toBe("Belgien");
  });
  it("überspringt Duplikate (Name ohne Groß/klein) und kaputte Zeilen", () => {
    expect(skipped).toEqual(["Doppelt: duvel", "| kaputte | Zeile |"]);
  });
  it("sortiert Sorten nach Häufigkeit", () => {
    expect(stylesByFrequency(entries)).toEqual(["Pils", "Belgisches Strong Golden Ale", "Hefeweizen"]);
  });
  it("erzeugt idempotentes Upsert-SQL mit escapten Hochkommas", () => {
    const sql = catalogToSql([{ name: "O'Hara's Stout", brewery: "Carlow", style: "Stout", country: "Irland", alcohol_free: false }]);
    expect(sql).toContain("('O''Hara''s Stout', 'Carlow', 'Stout', 'Irland', false)");
    expect(sql).toContain("on conflict ((lower(name))) do update");
  });
});

describe("bierkatalog.md", () => {
  it("lässt sich vollständig und ohne Fehler einlesen", () => {
    const { entries, skipped } = parseCatalog(readFileSync("bierkatalog.md", "utf8"));
    expect(skipped).toEqual([]);
    expect(entries.length).toBeGreaterThan(800);
    expect(entries.every((e) => e.name && e.country)).toBe(true);
  });
  it("catalogStyles.ts ist aktuell (sonst: npm run catalog)", () => {
    const { entries } = parseCatalog(readFileSync("bierkatalog.md", "utf8"));
    expect(CATALOG_STYLES).toEqual(stylesByFrequency(entries));
  });
});
