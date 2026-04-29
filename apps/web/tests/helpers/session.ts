import { expect, type Page } from "@playwright/test";

export const demoUsers = {
  admin: {
    email: "admin@fractional.app",
    password: "demo-admin-123",
  },
  investor: {
    email: "maya@fractional.app",
    password: "demo-investor-123",
  },
};

export async function loginAs(page: Page, user: keyof typeof demoUsers) {
  await page.goto("/login");
  await expect(page.getByText("Sign in")).toBeVisible();
  await page.getByPlaceholder("admin@fractional.app").fill(demoUsers[user].email);
  await page.getByPlaceholder("demo-admin-123").fill(demoUsers[user].password);
  await page.getByRole("button", { name: "Enter Dashboard" }).click();
  await expect(page).toHaveURL(/\/$/);
}
