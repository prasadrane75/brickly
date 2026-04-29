import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/session";

test("portfolio AI briefing renders a deterministic fallback summary", async ({ page }) => {
  await loginAs(page, "investor");

  await page.goto("/portfolio");
  await expect(page.getByText("AI briefing")).toBeVisible();
  await expect(page.getByText(/Source: deterministic/i)).toBeVisible();
  await expect(page.getByText("Trust Score")).toBeVisible();
  await expect(page.getByText("Verification Coverage", { exact: true })).toBeVisible();
  await expect(page.getByText(/Verified Insight|Fallback/)).toBeVisible();
});

test("transaction explanation flow expands AI explanation content", async ({ page }) => {
  await loginAs(page, "investor");

  await page.goto("/transactions");
  await expect(page.getByText("Completed transactions")).toBeVisible();

  await page.getByRole("button", { name: "Explain" }).first().click();
  await expect(page.getByText("AI-generated explanation")).toBeVisible();
  await expect(page.getByText(/deterministic/i)).toBeVisible();
  await expect(page.getByText("Verification")).toBeVisible();
  await expect(page.getByText("Trust note")).toBeVisible();
});

test("document summary flow generates and displays an AI summary", async ({ page }) => {
  await loginAs(page, "investor");

  await page.goto("/documents");
  await expect(page.getByRole("heading", { name: "Document index" }).first()).toBeVisible();

  await page.getByRole("button", { name: "AI Summary" }).first().click();
  await expect(page.getByText("AI-generated summary")).toBeVisible();
  await expect(page.getByText(/deterministic/i)).toBeVisible();
});
