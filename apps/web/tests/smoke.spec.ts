import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

async function login(page) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL/ADMIN_PASSWORD not set for UI smoke tests.");
  }
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/properties/);
}

test("loads login page", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});

test("loads liquidity dashboard", async ({ page }) => {
  await login(page);
  await page.goto("/admin/liquidity");
  await expect(page.getByRole("heading", { name: "Liquidity Dashboard" })).toBeVisible();
});

test("loads liquidity detail page", async ({ page }) => {
  await login(page);
  await page.goto("/admin/liquidity/prop-1");
  await expect(page.getByRole("heading", { name: "Liquidity Detail" })).toBeVisible();
});
