import test from "node:test";
import assert from "node:assert/strict";
import { rawApiFetch, loginAs } from "../support/http.js";
import {
  measureEndpoint,
  formatPerfStats,
  readPerfReport,
  writePerfReport,
  type PerfReport,
  type PerfReportEntry,
} from "../support/performance.js";

const iterations = Number(process.env.API_PERF_ITERATIONS ?? 8);
const warmupIterations = Number(process.env.API_PERF_WARMUP_ITERATIONS ?? 2);
const reportPath = process.env.API_PERF_REPORT_PATH ?? "cache/api-perf-report.json";
const baselinePath = process.env.API_PERF_BASELINE_PATH ?? "cache/api-perf-baseline.json";
const writeBaseline = process.env.API_PERF_WRITE_BASELINE === "1";
const maxAvgRegressionPercent = Number(process.env.API_PERF_MAX_AVG_REGRESSION_PERCENT ?? 50);
const maxP95RegressionPercent = Number(process.env.API_PERF_MAX_P95_REGRESSION_PERCENT ?? 75);
const reportEntries: PerfReportEntry[] = [];
const baselineReport = await readPerfReport(baselinePath);

const thresholds = {
  healthAvgMs: Number(process.env.API_PERF_HEALTH_AVG_MS ?? 150),
  healthP95Ms: Number(process.env.API_PERF_HEALTH_P95_MS ?? 250),
  propertiesAvgMs: Number(process.env.API_PERF_PROPERTIES_AVG_MS ?? 400),
  propertiesP95Ms: Number(process.env.API_PERF_PROPERTIES_P95_MS ?? 700),
  portfolioAvgMs: Number(process.env.API_PERF_PORTFOLIO_AVG_MS ?? 500),
  portfolioP95Ms: Number(process.env.API_PERF_PORTFOLIO_P95_MS ?? 900),
} as const;

function assertWithinBudget(
  stats: PerfReportEntry["stats"],
  avgBudgetMs: number,
  p95BudgetMs: number
) {
  assert.ok(
    stats.avgMs <= avgBudgetMs,
    `Expected avg <= ${avgBudgetMs}ms, received ${stats.avgMs}ms`
  );
  assert.ok(
    stats.p95Ms <= p95BudgetMs,
    `Expected p95 <= ${p95BudgetMs}ms, received ${stats.p95Ms}ms`
  );
}

function assertWithinBaseline(
  t: Parameters<typeof test>[1] extends (arg: infer T) => unknown ? T : never,
  entryName: string,
  stats: PerfReportEntry["stats"]
) {
  if (!baselineReport) {
    t.diagnostic(`No baseline report found at ${baselinePath}; skipping regression check.`);
    return;
  }

  const baselineEntry = baselineReport.entries.find((entry) => entry.name === entryName);
  if (!baselineEntry) {
    t.diagnostic(`No baseline entry for ${entryName}; skipping regression check.`);
    return;
  }

  const allowedAvgMs = Number(
    (baselineEntry.stats.avgMs * (1 + maxAvgRegressionPercent / 100)).toFixed(2)
  );
  const allowedP95Ms = Number(
    (baselineEntry.stats.p95Ms * (1 + maxP95RegressionPercent / 100)).toFixed(2)
  );

  t.diagnostic(
    `baseline avg=${baselineEntry.stats.avgMs}ms allowed<=${allowedAvgMs}ms, baseline p95=${baselineEntry.stats.p95Ms}ms allowed<=${allowedP95Ms}ms`
  );

  assert.ok(
    stats.avgMs <= allowedAvgMs,
    `Average latency regression for ${entryName}: baseline ${baselineEntry.stats.avgMs}ms, current ${stats.avgMs}ms, allowed ${allowedAvgMs}ms`
  );
  assert.ok(
    stats.p95Ms <= allowedP95Ms,
    `P95 latency regression for ${entryName}: baseline ${baselineEntry.stats.p95Ms}ms, current ${stats.p95Ms}ms, allowed ${allowedP95Ms}ms`
  );
}

function recordEntry(entry: PerfReportEntry) {
  reportEntries.push(entry);
}

function buildReport(): PerfReport {
  return {
    generatedAt: new Date().toISOString(),
    iterations,
    warmupIterations,
    entries: reportEntries,
  };
}

test("health endpoint stays within local latency budget", async (t) => {
  const stats = await measureEndpoint(() => rawApiFetch("/health"), {
    iterations,
    warmupIterations,
  });
  recordEntry({
    name: "health",
    path: "/health",
    stats,
    thresholds: {
      avgMs: thresholds.healthAvgMs,
      p95Ms: thresholds.healthP95Ms,
    },
  });

  t.diagnostic(formatPerfStats(stats));
  assertWithinBudget(stats, thresholds.healthAvgMs, thresholds.healthP95Ms);
  assertWithinBaseline(t, "health", stats);
});

test("properties list stays within local latency budget", async (t) => {
  const stats = await measureEndpoint(
    () => rawApiFetch("/v1/properties?page=1&pageSize=20"),
    {
      iterations,
      warmupIterations,
    }
  );
  recordEntry({
    name: "properties_list",
    path: "/v1/properties?page=1&pageSize=20",
    stats,
    thresholds: {
      avgMs: thresholds.propertiesAvgMs,
      p95Ms: thresholds.propertiesP95Ms,
    },
  });

  t.diagnostic(formatPerfStats(stats));
  assertWithinBudget(stats, thresholds.propertiesAvgMs, thresholds.propertiesP95Ms);
  assertWithinBaseline(t, "properties_list", stats);
});

test("portfolio summary stays within local latency budget", async (t) => {
  const token = await loginAs("investor");

  const stats = await measureEndpoint(
    () =>
      rawApiFetch("/v1/portfolio/summary", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    {
      iterations,
      warmupIterations,
    }
  );
  recordEntry({
    name: "portfolio_summary",
    path: "/v1/portfolio/summary",
    stats,
    thresholds: {
      avgMs: thresholds.portfolioAvgMs,
      p95Ms: thresholds.portfolioP95Ms,
    },
  });

  t.diagnostic(formatPerfStats(stats));
  assertWithinBudget(stats, thresholds.portfolioAvgMs, thresholds.portfolioP95Ms);
  assertWithinBaseline(t, "portfolio_summary", stats);
});

test.after(async () => {
  const report = buildReport();
  await writePerfReport(reportPath, report);

  if (writeBaseline) {
    await writePerfReport(baselinePath, report);
  }
});
