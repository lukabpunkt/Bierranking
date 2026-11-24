import type { Serving } from "./types";

export const SERVINGS: { value: Serving; label: string; icon: string }[] = [
  { value: "can", label: "Dose", icon: "🥫" },
  { value: "bottle", label: "Flasche", icon: "🍾" },
  { value: "tap", label: "Gezapft", icon: "🍺" },
];

export function servingInfo(s: Serving) {
  return SERVINGS.find((x) => x.value === s)!;
}

export function isServing(s: string | null | undefined): s is Serving {
  return s === "can" || s === "bottle" || s === "tap";
}

export const STYLES = [
  "Pils",
  "Helles",
  "Export",
  "Weizen",
  "Dunkel",
  "Bock",
  "IPA",
  "Lager",
  "Radler",
  "Alkoholfrei",
  "Sonstiges",
];

export const EMOJIS = [
  "🍺", "🍻", "🥨", "🌭", "🍕", "🍔", "🦊", "🐻",
  "🐼", "🐸", "🦁", "🐯", "🐙", "🦄", "🐝", "🐢",
  "🚀", "⚽", "🎸", "🎲", "👑", "🔥", "🌵", "😎",
];

export const COLORS = [
  "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6",
  "#3B82F6", "#06B6D4", "#10B981", "#84CC16",
  "#78716C", "#0F766E",
];
