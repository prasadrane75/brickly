import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/session";

test("loads login page", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Sign in")).toBeVisible();
});

test("loads liquidity dashboard", async ({ page }) => {
  await loginAs(page, "admin");
  await page.goto("/admin/liquidity");
  await expect(page.getByText("Liquidity Dashboard")).toBeVisible();
});

test("loads liquidity detail page", async ({ page }) => {
  await loginAs(page, "admin");
  await page.goto("/properties");
  await page.locator("a[href^='/properties/']").first().click();
  await expect(page.getByText("Property Overview")).toBeVisible();
});
