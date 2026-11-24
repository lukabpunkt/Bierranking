export type Grade = { label: string; value: number };

/** 16 Notenstufen. Niedriger = besser. */
export const GRADES: Grade[] = [
  { label: "1+", value: 0.7 },
  { label: "1", value: 1.0 },
  { label: "1−", value: 1.3 },
  { label: "2+", value: 1.7 },
  { label: "2", value: 2.0 },
  { label: "2−", value: 2.3 },
  { label: "3+", value: 2.7 },
  { label: "3", value: 3.0 },
  { label: "3−", value: 3.3 },
  { label: "4+", value: 3.7 },
  { label: "4", value: 4.0 },
  { label: "4−", value: 4.3 },
  { label: "5+", value: 4.7 },
  { label: "5", value: 5.0 },
  { label: "5−", value: 5.3 },
  { label: "6", value: 6.0 },
];

export type Modifier = "+" | "" | "−";

/** Nächstliegende Notenstufe. Bei exaktem Gleichstand gewinnt die bessere Note. */
export function nearestGrade(value: number): Grade {
  let best = GRADES[0];
  for (const g of GRADES) {
    if (Math.abs(g.value - value) < Math.abs(best.value - value) - 1e-9) best = g;
  }
  return best;
}

export function gradeLabel(value: number): string {
  return nearestGrade(value).label;
}

/** "2,1" bzw. "–" */
export function formatAvg(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "–";
  return (Math.round(value * 10) / 10).toFixed(1).replace(".", ",");
}

/** "Ø 2,1 (≈ 2)" */
export function formatAvgWithLabel(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "Ø –";
  return `Ø ${formatAvg(value)} (≈ ${gradeLabel(value)})`;
}

/** Note aus ganzer Note + Tendenz. 6 hat keine Tendenz. */
export function gradeFromParts(base: number, mod: Modifier): number {
  if (base >= 6) return 6.0;
  const delta = mod === "+" ? -0.3 : mod === "−" ? 0.3 : 0;
  return Math.round((base + delta) * 10) / 10;
}

export function partsFromGrade(value: number): { base: number; mod: Modifier } {
  const base = Math.round(value);
  const diff = Math.round((value - base) * 10) / 10;
  return { base, mod: diff < 0 ? "+" : diff > 0 ? "−" : "" };
}

export function isValidGrade(value: number): boolean {
  return GRADES.some((g) => Math.abs(g.value - value) < 1e-9);
}

// ---------- Farben ----------
type RGB = [number, number, number];

const STOPS: { at: number; rgb: RGB }[] = [
  { at: 0.7, rgb: [21, 128, 61] }, // sattgrün
  { at: 1.5, rgb: [22, 140, 64] },
  { at: 2.0, rgb: [34, 170, 80] }, // grün
  { at: 3.0, rgb: [150, 190, 30] }, // gelbgrün
  { at: 4.0, rgb: [245, 170, 20] }, // gelb/orange
  { at: 5.0, rgb: [234, 88, 32] }, // orange-rot
  { at: 6.0, rgb: [200, 30, 30] }, // rot
];

function interpolate(value: number): RGB {
  const v = Math.min(6, Math.max(0.7, value));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (v >= a.at && v <= b.at) {
      const t = (v - a.at) / (b.at - a.at);
      return [0, 1, 2].map((k) => Math.round(a.rgb[k] + (b.rgb[k] - a.rgb[k]) * t)) as RGB;
    }
  }
  return STOPS[STOPS.length - 1].rgb;
}

function toHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string): number {
  const parse = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
  const la = luminance(parse(a));
  const lb = luminance(parse(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const DARK_TEXT = "#1C1410";
const LIGHT_TEXT = "#FFFFFF";

/** Badge-Farben: Hintergrund nach Skala, Text mit dem besseren Kontrast. */
export function gradeColor(value: number): { bg: string; fg: string } {
  const rgb = interpolate(value);
  let bg = toHex(rgb);
  let fg = contrastRatio(bg, LIGHT_TEXT) >= contrastRatio(bg, DARK_TEXT) ? LIGHT_TEXT : DARK_TEXT;
  // Falls keiner der beiden Texte AA erreicht: Hintergrund leicht abdunkeln.
  let guard = 0;
  while (contrastRatio(bg, fg) < 4.5 && guard < 20) {
    const darker = rgb.map((c) => Math.max(0, Math.round(c * 0.92))) as RGB;
    rgb.splice(0, 3, ...darker);
    bg = toHex(rgb);
    fg = contrastRatio(bg, LIGHT_TEXT) >= contrastRatio(bg, DARK_TEXT) ? LIGHT_TEXT : DARK_TEXT;
    guard++;
  }
  return { bg, fg };
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
