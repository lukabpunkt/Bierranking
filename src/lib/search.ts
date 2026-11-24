/**
 * Normalisiert Text für die Suche: Kleinschreibung, Umlaute (ä→a, ö→o, ü→u, ß→ss),
 * sonstige Akzente entfernt, Mehrfach-Leerzeichen zusammengefasst.
 */
export function normalize(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type Searchable = { name: string; brewery?: string | null; style?: string | null };

/** Alle Suchbegriffe müssen in Name, Brauerei oder Sorte vorkommen. */
export function matchesQuery(item: Searchable, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const hay = normalize([item.name, item.brewery, item.style].filter(Boolean).join(" "));
  return q.split(" ").every((token) => hay.includes(token));
}

/** Relevanz für Vorschläge (höher = besser). 0 = kein Treffer. */
export function relevance(item: Searchable, query: string): number {
  const q = normalize(query);
  if (!q) return 1;
  const name = normalize(item.name);
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.split(" ").some((w) => w.startsWith(q))) return 60;
  if (name.includes(q)) return 40;
  if (matchesQuery(item, query)) return 20;
  return 0;
}

export function rankByRelevance<T extends Searchable>(items: T[], query: string): T[] {
  return items
    .map((item) => ({ item, score: relevance(item, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, "de"))
    .map((x) => x.item);
}

/** Schlüssel, mit dem die Datenbank Duplikate erkennt (lower(name) + lower(brewery)). */
export function duplicateKey(name: string, brewery: string | null | undefined): string {
  return `${name.trim().toLowerCase()}|${(brewery ?? "").trim().toLowerCase()}`;
}
