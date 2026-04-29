import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/session";

test("investor can log in and view dashboard plus portfolio", async ({ page }) => {
  await loginAs(page, "investor");

  await expect(page.getByText("Welcome back")).toBeVisible();
  await expect(page.getByText("Portfolio Value")).toBeVisible();
  await expect(page.getByText("Portfolio positions")).toBeVisible();

  await page.goto("/portfolio");
  await expect(page.getByText("Investor portfolio overview")).toBeVisible();
  await expect(page.getByText("AI briefing")).toBeVisible();
  await expect(page.getByText("Holdings")).toBeVisible();
});

test("investor can browse properties and open a property detail page", async ({ page }) => {
  await loginAs(page, "investor");

  await page.goto("/properties");
  await expect(page.getByRole("heading", { name: "Investment inventory" })).toBeVisible();
  await page.locator("a[href^='/properties/']").first().click();

  await expect(page.getByText("Property Overview")).toBeVisible();
  await expect(page.getByText("Cap table snapshot")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ownership history" })).toBeVisible();
});

test("investor can create a buy order from the orders screen", async ({ page }) => {
  await loginAs(page, "investor");

  await page.goto("/orders");
  await expect(page.getByText("Simulate an internal trade")).toBeVisible();

  await page.locator("input[type='number']").first().fill("1");
  await page.getByRole("button", { name: "Submit BUY Order" }).click();

  await expect(page.getByText(/order submitted/i)).toBeVisible();
});

test("investor can view deterministic sell price guidance without depending on AI availability", async ({
  page,
}) => {
  await loginAs(page, "investor");

  await page.goto("/orders");
  await page.getByRole("button", { name: "Sell" }).click();

  await expect(page.getByText(/Recommended price:/)).toBeVisible();
  await expect(page.getByText(/Reference price:/)).toBeVisible();
  await expect(page.getByText(/Liquidity score:/)).toBeVisible();
  await expect(page.getByText(/AI guidance/)).toBeVisible();
});
