import { expect, test, type Page } from "@playwright/test";
import { apiAs, env, loginAs } from "./helpers";

/**
 * Phase 5: Wunschliste, Etikett-Fotos, Barcode (Open Food Facts gemockt), Live-Updates, Highlights.
 * Gleiche Testnutzer wie flow.spec.ts (E2E_A_EMAIL, E2E_B_EMAIL, E2E_C_EMAIL, E2E_PASSWORD).
 */
const A = env.E2E_A_EMAIL;
const B = env.E2E_B_EMAIL;
const C = env.E2E_C_EMAIL;
const PW = env.E2E_PASSWORD;
const SHOTS = env.E2E_SCREENSHOTS;

test.skip(!A || !B || !C || !PW, "E2E-Testnutzer nicht konfiguriert");
test.describe.configure({ mode: "serial" });

let groupId = "";
let inviteCode = "";
const g = (sub = "", extra = "") => `/g/${sub ? sub + "/" : ""}?id=${groupId}${extra}`;
const nav = (page: Page) => page.getByRole("navigation", { name: "Hauptnavigation" });
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
};

/** Headless gibt es keine Kamera → Eingabefeld erscheint von selbst; sonst „Nummer eintippen“ antippen. */
async function openManualEntry(page: Page) {
  const typeIn = page.getByRole("button", { name: /Nummer eintippen/ });
  await page.getByLabel("Barcode-Nummer").or(typeIn).first().waitFor();
  if (await typeIn.isVisible()) await typeIn.click();
}

// Kleines, gültiges JPEG (1×1 px) für den Upload
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AP//Z",
  "base64",
);

test.beforeAll(async () => {
  // Profile per API onboarden, Gruppe anlegen, B tritt bei
  const a = await apiAs(A, PW);
  const b = await apiAs(B, PW);
  const ua = (await a.auth.getUser()).data.user!.id;
  const ub = (await b.auth.getUser()).data.user!.id;
  await a.from("profiles").update({ display_name: "Anna P5", emoji: "🦊", color: "#EF4444", onboarded: true }).eq("id", ua);
  await b.from("profiles").update({ display_name: "Tom P5", emoji: "🐻", color: "#3B82F6", onboarded: true }).eq("id", ub);
  const { data: group, error } = await a.rpc("create_group", { p_name: `P5 Runde ${Date.now().toString().slice(-4)}` });
  if (error || !group) throw error;
  groupId = group.id;
  inviteCode = group.invite_code;
  await b.rpc("join_group", { p_code: inviteCode });
});

test("Wunschliste: neues Bier nur merken, Filter, nach Bewertung automatisch weg", async ({ page, context }) => {
  await loginAs(context, A, PW);
  await page.goto(g());
  await nav(page).getByRole("link", { name: "Bewerten" }).click();
  await page.getByLabel("Bier suchen").fill("Schneider Weisse Tap 7");
  await page.getByRole("button", { name: /neu anlegen/ }).click();
  await page.getByLabel("Brauerei").fill("Schneider");
  await page.getByRole("button", { name: /Nur auf die Wunschliste/ }).click();
  await expect(page).toHaveURL(/\/g\/beer\/\?/);
  await expect(page.getByText("Auf deine Wunschliste gesetzt")).toBeVisible();
  await expect(page.getByRole("button", { name: "Auf meiner Wunschliste" })).toHaveAttribute("aria-pressed", "true");

  await page.goto(g("", "&mine=wish"));
  await expect(page.getByRole("link", { name: /Schneider Weisse Tap 7/ })).toBeVisible();
  await expect(page.getByLabel("Auf deiner Wunschliste")).toBeVisible();

  // Bewerten → verschwindet von der Wunschliste (DB-Trigger)
  await page.getByRole("link", { name: /Schneider Weisse Tap 7/ }).click();
  await page.getByRole("main").getByRole("link", { name: "Bewerten", exact: true }).click();
  await page.getByRole("radio", { name: "Note 1" }).click();
  await page.getByRole("radio", { name: "Flasche" }).click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page).toHaveURL(/\/g\/beer\/\?/);
  await expect(page.getByRole("button", { name: /Wunschliste|Will ich probieren/ })).toHaveCount(0);
  await page.goto(g("", "&mine=wish"));
  await expect(page.getByText("Nichts gefunden")).toBeVisible();
});

test("Etikett-Foto: hochladen, anzeigen, für Nicht-Mitglieder gesperrt", async ({ page, context }) => {
  await loginAs(context, A, PW);
  await page.goto(g());
  await page.getByRole("link", { name: /Schneider Weisse Tap 7/ }).click();
  await page.getByTestId("photo-input").setInputFiles({ name: "etikett.jpg", mimeType: "image/jpeg", buffer: JPEG });
  await expect(page.getByText("Foto gespeichert")).toBeVisible();
  const img = page.getByRole("img", { name: "Etikett von Schneider Weisse Tap 7" }).first();
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  await shot(page, "p5-photo");

  // Vorschaubild in der Liste
  await page.goto(g());
  await expect(page.locator('a[href*="beer"] img').first()).toBeVisible();

  // Nicht-Mitglied C kommt nicht an die Datei
  const a = await apiAs(A, PW);
  const { data: beer } = await a.from("beers").select("photo_path").eq("group_id", groupId).not("photo_path", "is", null).single();
  expect(beer?.photo_path).toMatch(new RegExp(`^${groupId}/[0-9a-f-]{36}\\.jpg$`));
  const c = await apiAs(C, PW);
  const { data: leaked, error } = await c.storage.from("beer-photos").download(beer!.photo_path!);
  expect(leaked).toBeNull();
  expect(error).not.toBeNull();
  const { error: upErr } = await c.storage
    .from("beer-photos")
    .upload(beer!.photo_path!, new Blob([JPEG], { type: "image/jpeg" }), { upsert: true });
  expect(upErr).not.toBeNull();
});

test("Barcode: Nummer eingeben → Open Food Facts füllt aus; bekannter Code wählt das Bier", async ({ page, context }) => {
  await loginAs(context, A, PW);
  await page.route("https://world.openfoodfacts.org/**", (route) =>
    route.fulfill({
      json: {
        status: 1,
        product: {
          product_name: "Pils",
          brands: "Jever",
          categories_tags: ["en:beers", "en:pilsner-beers"],
          countries_tags: ["en:germany"],
          nutriments: { alcohol: 4.9 },
        },
      },
    }),
  );
  await page.goto(g("rate"));
  await page.getByRole("button", { name: "Barcode scannen" }).click();
  await openManualEntry(page);
  await page.getByLabel("Barcode-Nummer").fill("4006381333931");
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await expect(page.getByText(/Open Food Facts übernommen/)).toBeVisible();
  await expect(page.getByLabel("Name *")).toHaveValue("Pils");
  await expect(page.getByLabel("Brauerei")).toHaveValue("Jever");
  await expect(page.getByLabel("Alkohol %")).toHaveValue("4,9");
  await expect(page.getByLabel("Land")).toHaveValue("Deutschland");
  await expect(page.getByRole("button", { name: "Pils", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("4006381333931")).toBeVisible();
  await page.getByLabel("Name *").fill("Jever Pilsener");
  await page.getByRole("radio", { name: "Note 2" }).click();
  await page.getByRole("radio", { name: "Flasche" }).click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page).toHaveURL(/\/g\/beer\/\?/);

  // Zweiter Scan desselben Codes → vorhandenes Bier wird direkt gewählt (kein OFF-Aufruf nötig)
  await page.goto(g("rate"));
  await page.getByRole("button", { name: "Barcode scannen" }).click();
  await openManualEntry(page);
  await page.getByLabel("Barcode-Nummer").fill("4006381333931");
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await expect(page.getByText("Gefunden: Jever Pilsener")).toBeVisible();
  await expect(page.getByRole("button", { name: "Anderes Bier wählen" })).toBeVisible();
});

test("Live: Bewertung von Tom erscheint bei Anna ohne Neuladen", async ({ page, context }) => {
  await loginAs(context, A, PW);
  await page.goto(g());
  const card = page.getByRole("link", { name: /Jever Pilsener/ });
  await expect(card).toContainText("1 Bewertung");
  await page.waitForTimeout(2500); // Realtime-Kanal aufbauen lassen

  const b = await apiAs(B, PW);
  const { data: beer } = await b.from("beers").select("id").eq("group_id", groupId).eq("name", "Jever Pilsener").single();
  const { error } = await b.from("ratings").insert({ beer_id: beer!.id, grade: 3, serving: "tap" });
  expect(error).toBeNull();

  await expect(page.getByText("Tom P5 hat gerade ein Bier bewertet")).toBeVisible({ timeout: 15_000 });
  await expect(card).toContainText("2 Bewertungen", { timeout: 15_000 });
});

test("Highlights: Aktivität, Hall of Fame/Shame, Abzeichen", async ({ page, context }) => {
  await loginAs(context, A, PW);
  await page.goto(g());
  await page.getByRole("link", { name: /Highlights/ }).click();
  await expect(page.getByRole("heading", { name: "Highlights" })).toBeVisible();
  await expect(page.getByText(/Tom P5 hat Jever Pilsener bewertet/)).toBeVisible();
  await expect(page.getByText(/Du hast Schneider Weisse Tap 7 neu angelegt/)).toBeVisible();
  await expect(page.getByText(/Tom P5 ist der Gruppe beigetreten/)).toBeVisible();
  await shot(page, "p5-feed");

  await page.getByRole("tab", { name: "Hall of Fame" }).click();
  await expect(page.getByLabel("Platz 1")).toBeVisible();
  await expect(page.getByRole("listitem").first()).toContainText("Schneider Weisse Tap 7");
  await shot(page, "p5-fame");

  await page.getByRole("tab", { name: "Hall of Shame" }).click();
  await expect(page.getByRole("listitem").first()).toContainText("Jever Pilsener");

  await page.getByRole("tab", { name: "Abzeichen" }).click();
  await expect(page.getByText(/Du hast \d+ von 13 Abzeichen/)).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Erste Runde" })).toContainText("erreicht");
  await shot(page, "p5-badges");

  // Profil zeigt eigene Abzeichen
  await nav(page).getByRole("link", { name: "Ich", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Meine Abzeichen" })).toBeVisible();
  await expect(page.getByText("Erste Runde")).toBeVisible();
});

test("Gruppen-Umschalter im Header öffnet sichtbar und wechselt die Gruppe", async ({ page, context }) => {
  const a = await apiAs(A, PW);
  const { data: second } = await a.rpc("create_group", { p_name: "Zweite Runde" });
  await loginAs(context, A, PW);
  await page.goto(g());
  await page.getByRole("button", { name: /Gruppe wechseln/ }).click();
  const target = page.getByRole("dialog", { name: "Gruppe wechseln" }).getByRole("link", { name: /Zweite Runde/ });
  await expect(target).toBeInViewport();
  await target.click();
  await expect(page).toHaveURL(new RegExp(`id=${second!.id}`));
  await expect(page.getByText("Noch kein Bier hier – Durst?")).toBeVisible();
});
