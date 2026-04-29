import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/session";

test("verified ownership status is visible on a property detail page", async ({ page }) => {
  await loginAs(page, "investor");

  await page.goto("/properties");
  await page.locator("a[href^='/properties/']").first().click();

  await expect(page.getByText(/Ownership verified|Ownership pending/)).toBeVisible();
  await expect(page.getByText(/Blockchain-verified ownership|Blockchain proof pending/)).toBeVisible();
  await expect(page.getByText("Ownership Timeline")).toBeVisible();
  await expect(page.getByText("Cap table narrative")).toBeVisible();
  await expect(page.getByText("Liquidity insight", { exact: true })).toBeVisible();
});

test("transaction list exposes proof-layer badges without blocking the ledger view", async ({ page }) => {
  await loginAs(page, "investor");

  await page.goto("/transactions");
  await expect(page.getByText(/Verified ownership live|Proof layer optional/)).toBeVisible();
  await expect(page.getByText(/Blockchain-verified transfer|Blockchain proof optional/).first()).toBeVisible();
});

test("admin can open blockchain-related liquidity and targeting views", async ({ page }) => {
  await loginAs(page, "admin");

  await page.goto("/admin/liquidity");
  await expect(page.getByText("Liquidity Dashboard")).toBeVisible();

  await page.goto("/admin/targeting");
  await expect(page.getByText("Targeting Rules")).toBeVisible();
});

test("admin audit history shows operational references for audited entities", async ({ page }) => {
  await loginAs(page, "admin");

  await page.goto("/admin/audit-logs");
  await expect(page.getByRole("heading", { name: "Operational history" })).toBeVisible();
  await expect(page.getByText("Audit event stream")).toBeVisible();
  await expect(page.getByText("Executive narrative")).toBeVisible();
  await expect(page.getByText("Flagged inconsistencies")).toBeVisible();
  await expect(page.getByRole("button", { name: "View" }).first()).toBeVisible();
  await expect(page.getByText(/property:|trade:/).first()).toBeVisible();

  await page.getByRole("button", { name: "View" }).first().click();
  await expect(page.getByText(/propertyProof|tradeProof/).first()).toBeVisible();
  await expect(page.getByText(/blockchainRef|verificationStatus/).first()).toBeVisible();
});
