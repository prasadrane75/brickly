import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const reportPath =
  process.env.WEB_PERF_REPORT_PATH ?? path.join(repoRoot, "cache/web-perf-report.json");
const baselinePath =
  process.env.WEB_PERF_BASELINE_PATH ?? path.join(repoRoot, "cache/web-perf-baseline.json");
const writeBaseline = process.env.WEB_PERF_WRITE_BASELINE === "1";
const maxElapsedRegressionPercent = Number(
  process.env.WEB_PERF_MAX_ELAPSED_REGRESSION_PERCENT ?? 50
);
const maxDomRegressionPercent = Number(process.env.WEB_PERF_MAX_DOM_REGRESSION_PERCENT ?? 50);
const maxLoadRegressionPercent = Number(process.env.WEB_PERF_MAX_LOAD_REGRESSION_PERCENT ?? 50);

const thresholds = {
  portfolioElapsedMs: Number(process.env.WEB_PERF_PORTFOLIO_ELAPSED_MS ?? 4000),
  portfolioDomContentLoadedMs: Number(process.env.WEB_PERF_PORTFOLIO_DOM_MS ?? 2500),
  portfolioLoadMs: Number(process.env.WEB_PERF_PORTFOLIO_LOAD_MS ?? 3500),
  propertiesElapsedMs: Number(process.env.WEB_PERF_PROPERTIES_ELAPSED_MS ?? 3500),
  propertiesDomContentLoadedMs: Number(process.env.WEB_PERF_PROPERTIES_DOM_MS ?? 2200),
  propertiesLoadMs: Number(process.env.WEB_PERF_PROPERTIES_LOAD_MS ?? 3200),
};

const reportEntries = [];
const baselineReport = await readReport(baselinePath);

const demoUsers = {
  investor: {
    email: "maya@fractional.app",
    password: "demo-investor-123",
  },
};

async function loginAs(page, user) {
  await page.goto("/login");
  await expect(page.getByText("Sign in")).toBeVisible();
  await page.getByPlaceholder("admin@fractional.app").fill(demoUsers[user].email);
  await page.getByPlaceholder("demo-admin-123").fill(demoUsers[user].password);
  await page.getByRole("button", { name: "Enter Dashboard" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function measurePageReadiness(page, pathName, readyLocator) {
  const startedAt = Date.now();
  await page.goto(pathName, { waitUntil: "load" });
  await expect(readyLocator).toBeVisible();
  const elapsedMs = Date.now() - startedAt;

  const navigationTiming = await page.evaluate(() => {
    const [entry] = performance.getEntriesByType("navigation");
    return {
      domContentLoadedMs: Number(entry.domContentLoadedEventEnd.toFixed(2)),
      loadMs: Number(entry.loadEventEnd.toFixed(2)),
    };
  });

  return {
    elapsedMs,
    ...navigationTiming,
  };
}

async function readReport(targetPath) {
  try {
    const content = await fs.readFile(targetPath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function assertWithinBaseline(testInfo, entryName, stats) {
  if (!baselineReport) {
    testInfo.annotations.push({
      type: "perf-baseline",
      description: `no baseline found at ${baselinePath}`,
    });
    return;
  }

  const baselineEntry = baselineReport.entries.find((entry) => entry.name === entryName);
  if (!baselineEntry) {
    testInfo.annotations.push({
      type: "perf-baseline",
      description: `no baseline entry for ${entryName}`,
    });
    return;
  }

  const allowedElapsedMs = Math.round(
    baselineEntry.stats.elapsedMs * (1 + maxElapsedRegressionPercent / 100)
  );
  const allowedDomMs = Number(
    (baselineEntry.stats.domContentLoadedMs * (1 + maxDomRegressionPercent / 100)).toFixed(2)
  );
  const allowedLoadMs = Number(
    (baselineEntry.stats.loadMs * (1 + maxLoadRegressionPercent / 100)).toFixed(2)
  );

  testInfo.annotations.push({
    type: "perf-baseline",
    description: `baseline elapsed=${baselineEntry.stats.elapsedMs}ms<=${allowedElapsedMs}ms dom=${baselineEntry.stats.domContentLoadedMs}ms<=${allowedDomMs}ms load=${baselineEntry.stats.loadMs}ms<=${allowedLoadMs}ms`,
  });

  expect(stats.elapsedMs).toBeLessThanOrEqual(allowedElapsedMs);
  expect(stats.domContentLoadedMs).toBeLessThanOrEqual(allowedDomMs);
  expect(stats.loadMs).toBeLessThanOrEqual(allowedLoadMs);
}

test.describe.configure({ mode: "serial" });

test("portfolio page meets browser performance smoke budget", async ({ page }, testInfo) => {
  await loginAs(page, "investor");

  const stats = await measurePageReadiness(
    page,
    "/portfolio",
    page.getByText("Investor portfolio overview")
  );
  await expect(page.getByText("AI briefing")).toBeVisible();

  reportEntries.push({
    name: "portfolio_page",
    path: "/portfolio",
    stats,
    thresholds: {
      elapsedMs: thresholds.portfolioElapsedMs,
      domContentLoadedMs: thresholds.portfolioDomContentLoadedMs,
      loadMs: thresholds.portfolioLoadMs,
    },
  });

  testInfo.annotations.push({
    type: "perf",
    description: `elapsed=${stats.elapsedMs}ms dom=${stats.domContentLoadedMs}ms load=${stats.loadMs}ms`,
  });

  expect(stats.elapsedMs).toBeLessThanOrEqual(thresholds.portfolioElapsedMs);
  expect(stats.domContentLoadedMs).toBeLessThanOrEqual(thresholds.portfolioDomContentLoadedMs);
  expect(stats.loadMs).toBeLessThanOrEqual(thresholds.portfolioLoadMs);
  assertWithinBaseline(testInfo, "portfolio_page", stats);
});

test("properties page meets browser performance smoke budget", async ({ page }, testInfo) => {
  await loginAs(page, "investor");

  const stats = await measurePageReadiness(
    page,
    "/properties",
    page.getByRole("heading", { name: "Investment inventory" })
  );

  reportEntries.push({
    name: "properties_page",
    path: "/properties",
    stats,
    thresholds: {
      elapsedMs: thresholds.propertiesElapsedMs,
      domContentLoadedMs: thresholds.propertiesDomContentLoadedMs,
      loadMs: thresholds.propertiesLoadMs,
    },
  });

  testInfo.annotations.push({
    type: "perf",
    description: `elapsed=${stats.elapsedMs}ms dom=${stats.domContentLoadedMs}ms load=${stats.loadMs}ms`,
  });

  expect(stats.elapsedMs).toBeLessThanOrEqual(thresholds.propertiesElapsedMs);
  expect(stats.domContentLoadedMs).toBeLessThanOrEqual(thresholds.propertiesDomContentLoadedMs);
  expect(stats.loadMs).toBeLessThanOrEqual(thresholds.propertiesLoadMs);
  assertWithinBaseline(testInfo, "properties_page", stats);
});

test.afterAll(async () => {
  const report = {
    generatedAt: new Date().toISOString(),
    entries: reportEntries,
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(
    reportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );

  if (writeBaseline) {
    await fs.writeFile(baselinePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
});
