/**
 * Import des Bierkatalogs: bierkatalog.md → supabase/catalog.sql (+ src/lib/catalogStyles.ts)
 *
 *   node scripts/import-catalog.ts            # Dateien erzeugen
 *   node scripts/import-catalog.ts --check    # nur prüfen (für CI), nichts schreiben
 *
 * Danach supabase/catalog.sql einspielen – z. B. im Supabase-SQL-Editor oder mit
 *   supabase db query --linked < supabase/catalog.sql   (bzw. psql "$SUPABASE_DB_URL" -f supabase/catalog.sql)
 * Das SQL ist idempotent (Upsert über lower(name)) und kann beliebig oft ausgeführt werden.
 *
 * Warum SQL statt direktem Upsert per API? Die Tabelle ist für Nutzer schreibgeschützt (RLS);
 * ein direkter Import bräuchte den service_role-Key, der nicht ins Repo/auf Rechner gehört.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { catalogToSql, parseCatalog, stylesByFrequency } from "../src/lib/catalogParse.ts";

const md = readFileSync(new URL("../bierkatalog.md", import.meta.url), "utf8");
const { entries, skipped } = parseCatalog(md);
const styles = stylesByFrequency(entries);

console.log(`${entries.length} Biere, ${new Set(entries.map((e) => e.brewery)).size} Brauereien, ${styles.length} Sorten`);
if (skipped.length) console.warn(`Übersprungen (${skipped.length}):\n  ` + skipped.join("\n  "));

if (process.argv.includes("--check")) process.exit(skipped.length ? 1 : 0);

writeFileSync(new URL("../supabase/catalog.sql", import.meta.url), catalogToSql(entries));
writeFileSync(
  new URL("../src/lib/catalogStyles.ts", import.meta.url),
  `// Automatisch erzeugt aus bierkatalog.md (node scripts/import-catalog.ts) – nicht von Hand bearbeiten.
// Sorten nach Häufigkeit im Katalog.
export const CATALOG_STYLES: string[] = ${JSON.stringify(styles, null, 2)};
`,
);
console.log("Geschrieben: supabase/catalog.sql, src/lib/catalogStyles.ts");
