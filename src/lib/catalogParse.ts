/** Parser für bierkatalog.md – genutzt vom Import-Skript und von den Unit-Tests. */

export type CatalogEntry = {
  name: string;
  brewery: string;
  style: string;
  country: string;
  alcohol_free: boolean;
};

/**
 * Liest alle Markdown-Tabellen (Spalten: Bier | Brauerei/Marke | Sorte | Alkoholfrei).
 * Das Land ist die jeweils letzte „## …“-Zwischenüberschrift. Abschnitte ohne Tabelle
 * (z. B. „Hinweise für Claude Code“) werden ignoriert. Doppelte Namen: der erste gewinnt.
 */
export function parseCatalog(markdown: string): { entries: CatalogEntry[]; skipped: string[] } {
  const entries: CatalogEntry[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();
  let country = "";

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      country = heading[1].trim();
      continue;
    }
    if (!line.startsWith("|")) continue;
    const cells = line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
    // Kopf- und Trennzeilen überspringen
    if (cells[0] === "Bier" || /^:?-{2,}/.test(cells[0])) continue;
    if (cells.length !== 4 || !cells[0]) {
      skipped.push(line);
      continue;
    }
    const [name, brewery, style, af] = cells;
    const key = name.toLowerCase();
    if (seen.has(key)) {
      skipped.push(`Doppelt: ${name}`);
      continue;
    }
    seen.add(key);
    entries.push({
      name: name.slice(0, 80),
      brewery: brewery.slice(0, 80),
      style: style.slice(0, 40),
      country: country.slice(0, 40),
      alcohol_free: /^(ja|yes|true|x)$/i.test(af),
    });
  }
  return { entries, skipped };
}

/** Sorten nach Häufigkeit (häufigste zuerst, bei Gleichstand A–Z). */
export function stylesByFrequency(entries: CatalogEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const e of entries) if (e.style) counts.set(e.style, (counts.get(e.style) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de")).map(([s]) => s);
}

const sql = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** Idempotentes Upsert-SQL (mehrfach ausführbar). */
export function catalogToSql(entries: CatalogEntry[]): string {
  const values = entries
    .map((e) => `  (${sql(e.name)}, ${sql(e.brewery)}, ${sql(e.style)}, ${sql(e.country)}, ${e.alcohol_free})`)
    .join(",\n");
  return `-- Automatisch erzeugt aus bierkatalog.md mit: node scripts/import-catalog.ts
-- Idempotent: kann beliebig oft ausgeführt werden (Upsert über lower(name)).
insert into public.beer_catalog (name, brewery, style, country, alcohol_free) values
${values}
on conflict ((lower(name))) do update set
  name = excluded.name,
  brewery = excluded.brewery,
  style = excluded.style,
  country = excluded.country,
  alcohol_free = excluded.alcohol_free,
  updated_at = now();
`;
}
