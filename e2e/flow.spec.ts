import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { apiAs, env, loginAs } from "./helpers";

/**
 * Kompletter Ablauf mit echten Testnutzern gegen das Supabase-Projekt.
 * Benötigt drei bestätigte Nutzer mit Passwort (siehe README → Tests):
 *   E2E_A_EMAIL, E2E_B_EMAIL, E2E_C_EMAIL, E2E_PASSWORD
 * Ohne diese Variablen wird der Test übersprungen.
 */
const A = env.E2E_A_EMAIL;
const B = env.E2E_B_EMAIL;
const C = env.E2E_C_EMAIL;
const PW = env.E2E_PASSWORD;
const SHOTS = env.E2E_SCREENSHOTS; // optional: Ordner für Screenshots

test.skip(!A || !B || !C || !PW, "E2E-Testnutzer nicht konfiguriert");
test.describe.configure({ mode: "serial" });

const GROUP = `E2E Stammtisch ${Date.now().toString().slice(-5)}`;
let groupUrl = ""; // z. B. /g/?id=<uuid>
let groupId = "";
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sub = (name: string) => `/g/${name}/?id=${groupId}`;
let inviteUrl = "";

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "horizontales Scrollen").toBeLessThanOrEqual(0);
}

async function rate(page: Page, opts: { search: string; create?: { brewery: string; style?: string }; grade: number; mod?: "+" | "−"; serving: string }) {
  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("link", { name: "Bewerten" }).click();
  await expect(page.getByRole("heading", { name: "Bier bewerten" })).toBeVisible();
  await page.getByLabel("Bier suchen").fill(opts.search);
  if (opts.create) {
    await page.getByRole("button", { name: new RegExp(`neu anlegen`) }).click();
    await page.getByLabel("Brauerei").fill(opts.create.brewery);
    if (opts.create.style) await page.getByRole("button", { name: opts.create.style, exact: true }).click();
  } else {
    await page.getByRole("button", { name: new RegExp(opts.search, "i") }).first().click();
  }
  await page.getByRole("radio", { name: `Note ${opts.grade}` }).click();
  if (opts.mod) await page.getByRole("radio", { name: opts.mod === "+" ? "Plus (besser)" : "Minus (schlechter)" }).click();
  await page.getByRole("radio", { name: opts.serving }).click();
}

test("A: Onboarding, Gruppe erstellen, Bier anlegen und bewerten", async ({ page, context }) => {
  await loginAs(context, A, PW);
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding/);
  await shot(page, "01-onboarding");
  await page.getByLabel("Name").fill("Anna E2E");
  await page.getByRole("button", { name: "Emoji 🦊" }).click();
  await page.getByRole("button", { name: /Los geht/ }).click();

  await expect(page).toHaveURL(/\/groups/);
  await shot(page, "02-groups-empty");
  await page.getByLabel("Name der Gruppe").fill(GROUP);
  await page.getByRole("button", { name: "Gruppe erstellen" }).click();
  await expect(page).toHaveURL(/\/g\/\?id=[0-9a-f-]{36}$/);
  const u = new URL(page.url());
  groupId = u.searchParams.get("id")!;
  groupUrl = `/g/?id=${groupId}`;
  await expect(page.getByText("Noch kein Bier hier – Durst?")).toBeVisible();
  await shot(page, "03-list-empty");

  // Neues Bier + Bewertung 2+ Flasche
  await rate(page, { search: "Löwenbräu Original", create: { brewery: "Löwenbräu", style: "Helles" }, grade: 2, mod: "+", serving: "Flasche" });
  await expect(page.getByLabel("Gewählte Note 2+")).toBeVisible();
  await shot(page, "04-rate");
  await noHorizontalScroll(page);
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page).toHaveURL(/\/g\/beer\/\?/);
  await expect(page.getByText(/Gespeichert 🍻/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Löwenbräu Original" })).toBeVisible();

  // Gleiches Gebinde → überschreibt (Hinweis sichtbar), anderes Gebinde → zusätzliche Bewertung
  await rate(page, { search: "Löwenbräu", grade: 1, serving: "Flasche" });
  await expect(page.getByText(/schon mit 2\+ bewertet – wird überschrieben/)).toBeVisible();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("heading", { name: /Alle Bewertungen \(1\)/ })).toBeVisible();

  await rate(page, { search: "Löwenbräu", grade: 3, serving: "Dose" });
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("heading", { name: /Alle Bewertungen \(2\)/ })).toBeVisible();
  await expect(page.getByLabel("Dose: Durchschnitt 3,0")).toBeVisible();
  await expect(page.getByLabel("Flasche: Durchschnitt 1,0")).toBeVisible();
  await expect(page.getByLabel("Gezapft: keine Daten")).toBeVisible();
  await shot(page, "05-detail");
  await noHorizontalScroll(page);

  // Duplikat mit anderer Schreibweise wird verhindert
  await rate(page, { search: "LÖWENBRÄU original", create: { brewery: "löwenbräu" }, grade: 4, serving: "Dose" });
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Das Bier gibt es schon.")).toBeVisible();

  // Zweites Bier, Einladungslink holen
  await page.goto(groupUrl);
  await rate(page, { search: "Tegernseer Hell", create: { brewery: "Tegernsee" }, grade: 1, mod: "+", serving: "Gezapft" });
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page).toHaveURL(/\/g\/beer\/\?/);

  await page.goto(sub("settings"));
  inviteUrl = await page.getByLabel("Einladungslink").inputValue();
  expect(inviteUrl).toMatch(/\/join\/\?code=[0-9a-f]{12}$/);
  await shot(page, "06-settings");
});

test("B: Einladung ohne Login → Login → Onboarding → automatisch Mitglied", async ({ page, context }) => {
  const inv = new URL(inviteUrl);
  const path = inv.pathname + inv.search;
  await page.goto(path);
  await expect(page.getByRole("heading", { name: `„${GROUP}“` })).toBeVisible();
  await expect(page.getByText("1 Mitglied")).toBeVisible();
  await shot(page, "07-join-preview");
  const loginHref = await page.getByRole("link", { name: /Anmelden/ }).getAttribute("href");
  expect(loginHref).toContain(encodeURIComponent(`${path}&auto=1`));

  // Login simulieren und dem "next"-Ziel folgen, wie es der Magic-Link-Callback tut
  await loginAs(context, B, PW);
  await page.goto(`${path}&auto=1`);
  await expect(page).toHaveURL(/\/onboarding\/\?next=/);
  await page.getByLabel("Name").fill("Tom E2E");
  await page.getByRole("button", { name: /Los geht/ }).click();
  await expect(page).toHaveURL(new RegExp(`${esc(groupUrl)}$`));
  await expect(page.getByText("Löwenbräu Original")).toBeVisible();
  await expect(page.getByText("Tegernseer Hell")).toBeVisible();
});

test("RLS: Nicht-Mitglied C sieht per API keine Gruppendaten", async () => {
  const c = await apiAs(C, PW);
    const [{ data: beers }, { data: groups }, { data: members }, { data: ratings }] = await Promise.all([
    c.from("beers").select("*").eq("group_id", groupId),
    c.from("groups").select("*").eq("id", groupId),
    c.from("group_members").select("*").eq("group_id", groupId),
    c.from("ratings").select("*"),
  ]);
  expect(beers).toEqual([]);
  expect(groups).toEqual([]);
  expect(members).toEqual([]);
  expect(ratings).toEqual([]);
  const { error } = await c.from("beers").insert({ group_id: groupId, name: "Eindringling" });
  expect(error).not.toBeNull();
  const { error: regen } = await c.rpc("regenerate_invite_code", { p_group: groupId });
  expect(regen?.message).toContain("forbidden");
});

test("B: Suche, Sortierung, Verdecken-Modus, Vergleich, Export", async ({ page, context }) => {
  await loginAs(context, B, PW);
  await page.goto(groupUrl);

  // Suche ignoriert Umlaute
  const search = page.getByLabel("Biere durchsuchen");
  await search.fill("lowen");
  await expect(page.getByText("Löwenbräu Original")).toBeVisible();
  await expect(page.getByText("Tegernseer Hell")).toHaveCount(0);
  await search.fill("");

  // Sortierung landet in der URL
  await page.getByRole("button", { name: "A–Z" }).click();
  await expect(page).toHaveURL(/sort=az/);
  await page.getByRole("button", { name: "Beste Note" }).click();

  // Verdecken-Modus
  await page.getByRole("button", { name: "Noten verdecken" }).click();
  const hiddenBadges = page.getByRole("button", { name: "Note verdeckt – antippen zum Aufdecken" });
  await expect(hiddenBadges).toHaveCount(2);
  await expect(page.getByText("Die Reihenfolge verrät die Noten")).toBeVisible();
  await shot(page, "08-list-hidden");
  await hiddenBadges.first().click();
  await expect(hiddenBadges).toHaveCount(1);
  await page.getByRole("button", { name: /Alle aufdecken/ }).click();
  await expect(hiddenBadges).toHaveCount(0);

  // Einstellung ist geräteübergreifend gespeichert
  const api = await apiAs(B, PW);
  const { data: who } = await api.auth.getUser();
  await expect
    .poll(async () => (await api.from("profiles").select("hide_grades").eq("id", who.user!.id).single()).data?.hide_grades)
    .toBe(true);

  // B bewertet Löwenbräu → Vergleich
  await rate(page, { search: "Löwenbräu", grade: 5, serving: "Flasche" });
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page).toHaveURL(/\/g\/beer\/\?/);
  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("link", { name: "Vergleich" }).click();
  await expect(page.getByRole("heading", { name: "Vergleich" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Löwenbräu Original" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Tegernseer Hell" })).toHaveCount(0);
  await shot(page, "09-compare");
  await page.getByRole("tab", { name: "Streitbiere" }).click();
  // Anna: Ø über Dose (3) und Flasche (1) = 2 → „2“; Tom: 5
  await expect(page.getByText(/Anna E2E 2 vs\. Tom E2E 5/)).toBeVisible();
  await page.getByRole("tab", { name: "Einigkeit" }).click();
  // Anna Ø(1,0;3,0)=2,0 vs. Tom 5,0 → 1 − 3/5,3 = 43 %
  await expect(page.getByText("43 %")).toBeVisible();
  await shot(page, "10-agreement");

  // Profil + Export
  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("link", { name: "Ich", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ich" })).toBeVisible();
  await expect(page.getByText("Du bist strenger als 100 % der Gruppe")).toBeVisible();
  await shot(page, "11-me");
  await noHorizontalScroll(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Meine Daten als CSV" }).click(),
  ]);
  const csv = readFileSync((await download.path())!, "utf8");
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain("Gruppe;Bier;Brauerei;Sorte;Note;Notenwert;Gebinde;Datum;Ort;Kommentar");
  expect(csv).toContain("Löwenbräu Original;Löwenbräu;Helles;5;5;Flasche");
});

test("A: Bewertung löschen + Rückgängig, Bier löschen + Papierkorb", async ({ page, context }) => {
  await loginAs(context, A, PW);
  await page.goto(groupUrl);
  await page.getByText("Tegernseer Hell").click();
  await expect(page.getByRole("heading", { name: /Alle Bewertungen \(1\)/ })).toBeVisible();
  await page.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByRole("heading", { name: /Alle Bewertungen \(0\)/ })).toBeVisible();
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await expect(page.getByRole("heading", { name: /Alle Bewertungen \(1\)/ })).toBeVisible();

  await page.getByRole("button", { name: "Weitere Aktionen" }).click();
  await page.getByRole("button", { name: "Bier löschen" }).click();
  await expect(page).toHaveURL(new RegExp(`${esc(groupUrl)}$`));
  await expect(page.getByRole("link", { name: /Tegernseer Hell/ })).toHaveCount(0);
  await expect(page.getByText(/„Tegernseer Hell“ gelöscht/)).toBeVisible();

  await page.goto(sub("settings"));
  await page.getByRole("button", { name: "Zurück" }).click();
  await expect(page.getByText(/wiederhergestellt/)).toBeVisible();
  await page.goto(groupUrl);
  await expect(page.getByRole("link", { name: /Tegernseer Hell/ })).toBeVisible();

  // Letzter Admin kann nicht austreten
  await page.goto(sub("settings"));
  await page.getByRole("button", { name: "Gruppe verlassen" }).click();
  await page.getByRole("button", { name: /verlassen/ }).last().click();
  await expect(page.getByText("Du bist der letzte Admin")).toBeVisible();
});
