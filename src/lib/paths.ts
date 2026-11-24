/** Unterpfad, unter dem die App ausgeliefert wird (GitHub Pages: "/Bierranking"). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Pfad für statische Dateien (public/), die nicht über <Link> laufen. */
export function asset(path: string) {
  return `${BASE_PATH}${path}`;
}

type Sub = "" | "rate" | "beer" | "compare" | "settings";

/** Link innerhalb einer Gruppe, z. B. groupHref(id, "beer", { beer: x }) → /g/beer/?id=…&beer=… */
export function groupHref(groupId: string, sub: Sub = "", extra: Record<string, string | null | undefined> = {}) {
  const params = new URLSearchParams({ id: groupId });
  for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
  return `/g/${sub ? sub + "/" : ""}?${params.toString()}`;
}

/** Absolute URL im Browser (inkl. Basis-Pfad), z. B. für Einladungslinks. */
export function absoluteUrl(path: string) {
  return `${window.location.origin}${BASE_PATH}${path}`;
}

/** Pfadname ohne abschließenden Slash ("/g/rate/" → "/g/rate"). */
export function normalizePath(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}
