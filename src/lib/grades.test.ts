import { describe, expect, it } from "vitest";
import {
  GRADES,
  contrastRatio,
  formatAvg,
  formatAvgWithLabel,
  gradeColor,
  gradeFromParts,
  gradeLabel,
  isValidGrade,
  partsFromGrade,
} from "./grades";

describe("GRADES", () => {
  it("hat 16 Stufen, aufsteigend, ohne 6+/6−", () => {
    expect(GRADES).toHaveLength(16);
    for (let i = 1; i < GRADES.length; i++) expect(GRADES[i].value).toBeGreaterThan(GRADES[i - 1].value);
    expect(GRADES.map((g) => g.label)).not.toContain("6+");
    expect(GRADES.map((g) => g.label)).not.toContain("6−");
    expect(GRADES[0]).toEqual({ label: "1+", value: 0.7 });
    expect(GRADES[15]).toEqual({ label: "6", value: 6 });
  });
});

describe("gradeLabel", () => {
  it("liefert die exakte Stufe", () => {
    for (const g of GRADES) expect(gradeLabel(g.value)).toBe(g.label);
  });
  it("rundet auf die nächstliegende Stufe", () => {
    expect(gradeLabel(2.1)).toBe("2");
    expect(gradeLabel(2.2)).toBe("2−");
    expect(gradeLabel(0.5)).toBe("1+");
    expect(gradeLabel(5.8)).toBe("6");
    expect(gradeLabel(5.6)).toBe("5−");
  });
});

describe("formatAvg", () => {
  it("formatiert mit Komma und einer Nachkommastelle", () => {
    expect(formatAvg(2.13)).toBe("2,1");
    expect(formatAvg(2)).toBe("2,0");
    expect(formatAvg(0.7)).toBe("0,7");
    expect(formatAvg(1.65)).toBe("1,7");
  });
  it("zeigt – für leere Werte", () => {
    expect(formatAvg(null)).toBe("–");
    expect(formatAvg(undefined)).toBe("–");
    expect(formatAvg(NaN)).toBe("–");
  });
  it("mit Label", () => {
    expect(formatAvgWithLabel(2.1)).toBe("Ø 2,1 (≈ 2)");
  });
});

describe("gradeFromParts / partsFromGrade", () => {
  it("baut alle 16 Noten", () => {
    const built = new Set<number>();
    for (let base = 1; base <= 6; base++)
      for (const mod of ["+", "", "−"] as const) built.add(gradeFromParts(base, mod));
    expect([...built].sort((a, b) => a - b)).toEqual(GRADES.map((g) => g.value));
  });
  it("6 hat keine Tendenz", () => {
    expect(gradeFromParts(6, "+")).toBe(6);
    expect(gradeFromParts(6, "−")).toBe(6);
  });
  it("ist umkehrbar", () => {
    for (const g of GRADES) {
      const { base, mod } = partsFromGrade(g.value);
      expect(gradeFromParts(base, mod)).toBe(g.value);
    }
  });
  it("validiert", () => {
    expect(isValidGrade(1.7)).toBe(true);
    expect(isValidGrade(1.5)).toBe(false);
  });
});

describe("gradeColor", () => {
  it("liefert für alle Stufen AA-Kontrast", () => {
    for (const g of GRADES) {
      const { bg, fg } = gradeColor(g.value);
      expect(bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("gut ist grün, schlecht ist rot", () => {
    const good = gradeColor(0.7).bg;
    const bad = gradeColor(6).bg;
    const g = (h: string) => parseInt(h.slice(3, 5), 16);
    const r = (h: string) => parseInt(h.slice(1, 3), 16);
    expect(g(good)).toBeGreaterThan(r(good));
    expect(r(bad)).toBeGreaterThan(g(bad));
  });
});
