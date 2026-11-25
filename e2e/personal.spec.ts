import { expect, test } from "@playwright/test";
import { apiAs, env, loginAs } from "./helpers";

/**
 * Bewertungen gehören der Person: In Gruppe A bewertet → erscheint sofort in neuer Gruppe B
 * (und umgekehrt), Änderungen sind überall gleich.
 */
const A = env.E2E_A_EMAIL;
const B = env.E2E_B_EMAIL;
const PW = env.E2E_PASSWORD;

test.skip(!A || !B || !PW, "E2E-Testnutzer nicht konfiguriert");
test.describe.configure({ mode: "serial" });

let g1 = "";
let g2 = "";
const stamp = Date.now().toString().slice(-5);
const BEER = `Persönlich ${stamp}`;

test.beforeAll(async () => {
  const a = await apiAs(A, PW);
  const b = await apiAs(B, PW);
  const ua = (await a.auth.getUser()).data.user!.id;
  const ub = (await b.auth.getUser()).data.user!.id;
  await a.from("profiles").update({ display_name: "Anna P", emoji: "🦊", onboarded: true }).eq("id", ua);
  await b.from("profiles").update({ display_name: "Tom P", emoji: "🐻", onboarded: true }).eq("id", ub);
  const { data } = await a.rpc("create_group", { p_name: `Gruppe A ${stamp}` });
  g1 = data!.id;
});

test("In Gruppe A bewertet → neue Gruppe B zeigt das Bier mit derselben Note", async ({ page, context }) => {
  await loginAs(context, A, PW);
  await page.goto(`/g/rate/?id=${g1}`);
  await page.getByLabel("Bier suchen").fill(BEER);
  await page.getByRole("button", { name: /neu anlegen/ }).click();
  await page.getByRole("radio", { name: "Note 2" }).click();
  await page.getByRole("radio", { name: "Plus (besser)" }).click();
  await page.getByRole("radio", { name: "Dose" }).click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page).toHaveURL(/\/g\/beer\/\?/);

  // Neue Gruppe B anlegen – über die Oberfläche
  await page.goto("/groups/");
  await page.getByLabel("Name der Gruppe").fill(`Gruppe B ${stamp}`);
  await page.getByRole("button", { name: "Gruppe erstellen" }).click();
  await expect(page).toHaveURL(/\/g\/\?id=/);
  g2 = new URL(page.url()).searchParams.get("id")!;
  expect(g2).not.toBe(g1);

  // Bier + Note sind sofort da
  const card = page.getByRole("link", { name: new RegExp(BEER) });
  await expect(card).toBeVisible();
  await expect(card.getByLabel(/Durchschnitt 1,7, etwa Note 2\+/)).toBeVisible();
});

test("Änderung in Gruppe B gilt auch in Gruppe A (eine Bewertung, überall gleich)", async ({ page, context }) => {
  await loginAs(context, A, PW);
  await page.goto(`/g/?id=${g2}`);
  await page.getByRole("link", { name: new RegExp(BEER) }).click();
  await page.getByRole("link", { name: "Bearbeiten" }).click();
  await page.getByRole("radio", { name: "Note 1" }).click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("heading", { name: /Alle Bewertungen \(1\)/ })).toBeVisible();

  await page.goto(`/g/?id=${g1}`);
  const card = page.getByRole("link", { name: new RegExp(BEER) });
  await expect(card.getByLabel(/Durchschnitt 1,0, etwa Note 1/)).toBeVisible();
  await expect(card).toContainText("1 Bewertung");
});

test("Wer einer Gruppe beitritt, bringt seine Bewertungen mit", async ({ page, context }) => {
  // Tom bewertet das Bier, ohne in einer gemeinsamen Gruppe zu sein …
  const b = await apiAs(B, PW);
  const { data: beer } = await b.from("beers").select("id").eq("name", BEER).single();
  await b.from("ratings").insert({ beer_id: beer!.id, grade: 4, serving: "tap" });
  // … und tritt dann Gruppe A bei
  const a = await apiAs(A, PW);
  const { data: grp } = await a.from("groups").select("invite_code").eq("id", g1).single();
  await b.rpc("join_group", { p_code: grp!.invite_code });

  await loginAs(context, A, PW);
  await page.goto(`/g/?id=${g1}`);
  const card = page.getByRole("link", { name: new RegExp(BEER) });
  await expect(card).toContainText("2 Bewertungen");
  // Gruppe B (ohne Tom) zeigt weiterhin nur Annas Bewertung
  await page.goto(`/g/?id=${g2}`);
  await expect(page.getByRole("link", { name: new RegExp(BEER) })).toContainText("1 Bewertung");
});

test("Bier, das andere bewertet haben, kann die anlegende Person nicht löschen", async ({ page, context }) => {
  await loginAs(context, A, PW);
  await page.goto(`/g/?id=${g1}`);
  await page.getByRole("link", { name: new RegExp(BEER) }).click();
  await page.getByRole("button", { name: "Weitere Aktionen" }).click();
  await expect(page.getByRole("button", { name: "Bier bearbeiten" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bier löschen" })).toHaveCount(0);
  // auch per API gesperrt
  const a = await apiAs(A, PW);
  const { data: beer } = await a.from("beers").select("id").eq("name", BEER).single();
  const { error } = await a.from("beers").update({ deleted_at: new Date().toISOString() }).eq("id", beer!.id);
  expect(error?.message).toContain("beer_in_use");
});
