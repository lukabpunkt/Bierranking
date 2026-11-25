import { expect, test } from "@playwright/test";
import { apiAs, env, loginAs } from "./helpers";

/** Bierkatalog: Vorschläge beim Tippen (Umlaute/Tippfehler egal), Übernahme der Daten, catalog_id. */
const A = env.E2E_A_EMAIL;
const PW = env.E2E_PASSWORD;

test.skip(!A || !PW, "E2E-Testnutzer nicht konfiguriert");
test.describe.configure({ mode: "serial" });

let groupId = "";

test.beforeAll(async () => {
  const a = await apiAs(A, PW);
  const ua = (await a.auth.getUser()).data.user!.id;
  await a.from("profiles").update({ display_name: "Anna K", onboarded: true }).eq("id", ua);
  const { data } = await a.rpc("create_group", { p_name: `Katalog ${Date.now().toString().slice(-4)}` });
  groupId = data!.id;
});

test("Katalog-RPC: Umlaute und Tippfehler werden gefunden", async () => {
  const a = await apiAs(A, PW);
  const umlaut = await a.rpc("search_catalog", { q: "lowenbrau orig" });
  expect(umlaut.data?.map((c: { name: string }) => c.name)).toContain("Löwenbräu Original");
  const typo = await a.rpc("search_catalog", { q: "krombacker pils" });
  expect(typo.data?.[0]?.name).toBe("Krombacher Pils");
  const short = await a.rpc("search_catalog", { q: "k" });
  expect(short.data).toEqual([]);
  // Katalog ist für Nutzer schreibgeschützt
  const { data: hacked } = await a.from("beer_catalog").update({ name: "X" }).eq("name", "Krombacher Pils").select();
  expect(hacked).toEqual([]);
});

test("Vorschlag antippen → Daten übernommen → direkt bewerten", async ({ page, context }) => {
  await loginAs(context, A, PW);
  await page.goto(`/g/rate/?id=${groupId}`);
  await page.getByLabel("Bier suchen").fill("lowenbrau orig");
  const proposal = page.getByRole("button", { name: /Löwenbräu Original.*Vorschlag/ });
  await expect(proposal).toBeVisible();
  await proposal.click();
  await expect(page.getByText("Vorschlag aus dem Bierkatalog")).toBeVisible();
  await page.getByRole("radio", { name: "Note 2" }).click();
  await page.getByRole("radio", { name: "Flasche" }).click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page).toHaveURL(/\/g\/beer\/\?/);
  await expect(page.getByRole("heading", { name: "Löwenbräu Original" })).toBeVisible();
  await expect(page.getByText(/Deutschland/).first()).toBeVisible();

  const a = await apiAs(A, PW);
  const { data: beer } = await a.from("beers").select("catalog_id, country, style").eq("name", "Löwenbräu Original").single();
  expect(beer?.catalog_id).toBeTruthy();
  expect(beer?.country).toBe("Deutschland");

  // Nochmal suchen: jetzt „in eurer Liste“ statt Vorschlag
  await page.goto(`/g/rate/?id=${groupId}`);
  await page.getByLabel("Bier suchen").fill("löwenbräu orig");
  await expect(page.getByRole("button", { name: /Löwenbräu Original.*in eurer Liste/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Löwenbräu Original.*Vorschlag/ })).toHaveCount(0);
});

test("Sorten-Chips kommen aus dem Katalog, andere Sorten per Eingabe", async ({ page, context }) => {
  await loginAs(context, A, PW);
  await page.goto(`/g/rate/?id=${groupId}`);
  await page.getByLabel("Bier suchen").fill("Hausgebraut Spezial");
  await page.getByRole("button", { name: /neu anlegen/ }).click();
  for (const s of ["Lager", "Pils", "Hefeweizen", "Kölsch"]) await expect(page.getByRole("button", { name: s, exact: true })).toBeVisible();
  await page.getByLabel("Andere Sorte").fill("Tripel");
  await expect(page.getByLabel("Andere Sorte")).toHaveValue("Tripel");
});
