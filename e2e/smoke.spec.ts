import { expect, test } from "@playwright/test";

test("Login-Seite zeigt Magic-Link-Formular", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Prost-Zeugnis" })).toBeVisible();
  await expect(page.getByLabel("E-Mail-Adresse")).toBeVisible();
  await expect(page.getByRole("button", { name: /Link senden/ })).toBeDisabled();
  await page.getByLabel("E-Mail-Adresse").fill("test@example.com");
  await expect(page.getByRole("button", { name: /Link senden/ })).toBeEnabled();
});

test("Geschützte Seiten leiten zum Login um und merken das Ziel", async ({ page }) => {
  await page.goto("/me");
  await expect(page).toHaveURL(/\/login\?next=%2Fme/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("Ungültiger Einladungslink ist ohne Login sichtbar", async ({ page }) => {
  await page.goto("/join/doesnotexist");
  await expect(page.getByRole("heading", { name: "Einladung ungültig" })).toBeVisible();
});

test("Fehlerhafter Auth-Link führt zurück zum Login mit Hinweis", async ({ page }) => {
  await page.goto("/auth/callback?code=kaputt");
  await expect(page).toHaveURL(/\/login\?error=link/);
  await expect(page.getByText(/ungültig oder abgelaufen/)).toBeVisible();
});

test("PWA-Manifest und Icons sind erreichbar", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest.name).toBe("Prost-Zeugnis");
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBeTruthy();
  expect((await request.get("/sw.js")).ok()).toBeTruthy();
});

test("Kein horizontales Scrollen auf 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/login");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
