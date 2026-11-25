/** Barcode → Biervorschlag über Open Food Facts (offene Produktdatenbank, CORS-fähig). */

export type ProductSuggestion = {
  barcode: string;
  name: string;
  brewery: string;
  style: string;
  abv: string;
  country: string;
};

type OffProduct = {
  product_name?: string;
  product_name_de?: string;
  generic_name_de?: string;
  brands?: string;
  categories_tags?: string[];
  countries_tags?: string[];
  origins?: string;
  nutriments?: Record<string, unknown>;
  labels_tags?: string[];
};

const STYLE_RULES: [RegExp, string][] = [
  [/alcohol-free|non-alcoholic|alkoholfrei|sans-alcool|0[,.]0/, "Alkoholfrei"],
  [/radler|shandy|biermischgetr/, "Radler"],
  [/india-pale-ale|\bipa\b|-ipa/, "IPA"],
  [/witbier|blanche/, "Witbier"],
  [/wheat|weizen|weiss|weiß|hefe/, "Hefeweizen"],
  [/bock|doppelbock|weizenbock/, "Bock"],
  [/pils|pilsner|pilsener/, "Pils"],
  [/helles|\bhell\b|munich-lager/, "Helles"],
  [/export|dortmunder/, "Export"],
  [/stout/, "Stout"],
  [/porter/, "Porter"],
  [/schwarzbier|black-beer/, "Schwarzbier"],
  [/dunkel|dark-beer/, "Dunkel"],
  [/kolsch|kölsch/, "Kölsch"],
  [/lager/, "Lager"],
];

/** Sorte aus Kategorien und Name raten (erste passende Regel gewinnt). */
export function guessStyle(categories: string[] = [], name = ""): string {
  const hay = [...categories, name].join(" ").toLowerCase();
  for (const [re, style] of STYLE_RULES) if (re.test(hay)) return style;
  return "";
}

const COUNTRY_NAMES: Record<string, string> = {
  "en:germany": "Deutschland",
  "en:austria": "Österreich",
  "en:switzerland": "Schweiz",
  "en:belgium": "Belgien",
  "en:netherlands": "Niederlande",
  "en:czech-republic": "Tschechien",
  "en:czechia": "Tschechien",
  "en:ireland": "Irland",
  "en:united-kingdom": "Großbritannien",
  "en:scotland": "Schottland",
  "en:mexico": "Mexiko",
  "en:denmark": "Dänemark",
  "en:poland": "Polen",
  "en:italy": "Italien",
  "en:france": "Frankreich",
  "en:spain": "Spanien",
  "en:united-states": "USA",
  "en:japan": "Japan",
};

/** Open-Food-Facts-Produkt in einen Biervorschlag übersetzen. */
export function parseProduct(barcode: string, p: OffProduct): ProductSuggestion {
  const brand = (p.brands ?? "").split(",")[0]?.trim() ?? "";
  const rawName = (p.product_name_de || p.product_name || p.generic_name_de || "").trim();
  const alcohol = p.nutriments?.["alcohol"] ?? p.nutriments?.["alcohol_100g"] ?? p.nutriments?.["alcohol_value"];
  const abvNum = typeof alcohol === "number" ? alcohol : typeof alcohol === "string" ? Number(alcohol.replace(",", ".")) : NaN;
  // Herkunft bevorzugt aus "origins", sonst Verkaufsland nur, wenn es eindeutig ist
  const origin = (p.origins ?? "").split(",")[0]?.trim() ?? "";
  const countries = (p.countries_tags ?? []).map((c) => COUNTRY_NAMES[c]).filter(Boolean);
  return {
    barcode,
    name: rawName || brand,
    brewery: brand && rawName.toLowerCase() !== brand.toLowerCase() ? brand : "",
    style: guessStyle([...(p.categories_tags ?? []), ...(p.labels_tags ?? [])], rawName),
    abv: Number.isFinite(abvNum) && abvNum >= 0 && abvNum <= 70 ? String(Math.round(abvNum * 10) / 10).replace(".", ",") : "",
    country: origin.slice(0, 40) || (countries.length === 1 ? countries[0] : ""),
  };
}

/** Gültige EAN-8 / EAN-13 / UPC-A Prüfziffer? */
export function isValidEan(code: string): boolean {
  if (!/^\d{8}$|^\d{12,13}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export async function lookupBarcode(barcode: string, signal?: AbortSignal): Promise<ProductSuggestion | null> {
  const fields = "product_name,product_name_de,generic_name_de,brands,categories_tags,countries_tags,origins,nutriments,labels_tags";
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`,
    { signal },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { status?: number; product?: OffProduct };
  if (json.status !== 1 || !json.product) return null;
  const s = parseProduct(barcode, json.product);
  return s.name ? s : null;
}
