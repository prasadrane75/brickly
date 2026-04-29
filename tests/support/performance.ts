import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";

export type PerfRunResult = {
  status: number;
  durationMs: number;
};

export type PerfStats = {
  iterations: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p95Ms: number;
};

export type PerfReportEntry = {
  name: string;
  path: string;
  stats: PerfStats;
  thresholds: {
    avgMs: number;
    p95Ms: number;
  };
};

export type PerfReport = {
  generatedAt: string;
  iterations: number;
  warmupIterations: number;
  entries: PerfReportEntry[];
};

export async function measureEndpoint(
  request: () => Promise<Response>,
  options: {
    iterations?: number;
    warmupIterations?: number;
    expectedStatus?: number;
  } = {}
): Promise<PerfStats> {
  const iterations = options.iterations ?? 6;
  const warmupIterations = options.warmupIterations ?? 2;
  const expectedStatus = options.expectedStatus ?? 200;

  for (let index = 0; index < warmupIterations; index += 1) {
    const response = await request();
    assert.equal(response.status, expectedStatus);
    await response.arrayBuffer();
  }

  const runs: PerfRunResult[] = [];

  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now();
    const response = await request();
    await response.arrayBuffer();
    const endedAt = performance.now();

    assert.equal(response.status, expectedStatus);

    runs.push({
      status: response.status,
      durationMs: Number((endedAt - startedAt).toFixed(2)),
    });
  }

  return summarizePerfRuns(runs);
}

export function summarizePerfRuns(runs: PerfRunResult[]): PerfStats {
  assert.ok(runs.length > 0, "Expected at least one performance sample");

  const durations = runs
    .map((run) => run.durationMs)
    .sort((left, right) => left - right);

  const total = durations.reduce((sum, value) => sum + value, 0);
  const percentileIndex = Math.min(
    durations.length - 1,
    Math.ceil(durations.length * 0.95) - 1
  );

  return {
    iterations: runs.length,
    minMs: durations[0],
    maxMs: durations[durations.length - 1],
    avgMs: Number((total / durations.length).toFixed(2)),
    p95Ms: durations[percentileIndex],
  };
}

export function formatPerfStats(stats: PerfStats) {
  return [
    `iterations=${stats.iterations}`,
    `min=${stats.minMs}ms`,
    `avg=${stats.avgMs}ms`,
    `p95=${stats.p95Ms}ms`,
    `max=${stats.maxMs}ms`,
  ].join(", ");
}

export async function writePerfReport(
  reportPath: string,
  payload: PerfReport
) {
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function readPerfReport(reportPath: string): Promise<PerfReport | null> {
  try {
    const content = await fs.readFile(reportPath, "utf8");
    return JSON.parse(content) as PerfReport;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
}
