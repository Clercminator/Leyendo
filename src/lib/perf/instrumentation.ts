export type LeePerfMetricName =
  | "import.extract"
  | "import.build-document"
  | "reader.derive-runtime-chunks"
  | "reader.playback-drift";

export interface LeePerfMetric {
  name: LeePerfMetricName;
  durationMs: number;
  timestamp: number;
  detail?: Record<string, number | string | boolean | undefined>;
}

declare global {
  var __LEE_PERF_METRICS__: LeePerfMetric[] | undefined;
  var __LEE_ENABLE_PERF_LOGS__: boolean | undefined;
}

function getMetricStore() {
  if (!globalThis.__LEE_PERF_METRICS__) {
    globalThis.__LEE_PERF_METRICS__ = [];
  }

  return globalThis.__LEE_PERF_METRICS__;
}

function getNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function clearPerfMetrics() {
  getMetricStore().length = 0;
}

export function getPerfMetrics() {
  return [...getMetricStore()];
}

export function recordPerfMetric(metric: LeePerfMetric) {
  getMetricStore().push(metric);

  if (globalThis.__LEE_ENABLE_PERF_LOGS__) {
    console.info(`[lee:perf] ${metric.name}`, metric);
  }
}

export function measureSync<T>(
  name: LeePerfMetricName,
  detail: LeePerfMetric["detail"],
  callback: () => T,
) {
  const startedAt = getNow();
  const result = callback();

  recordPerfMetric({
    name,
    durationMs: Math.round(getNow() - startedAt),
    timestamp: Date.now(),
    detail,
  });

  return result;
}

export async function measureAsync<T>(
  name: LeePerfMetricName,
  detail: LeePerfMetric["detail"],
  callback: () => Promise<T>,
) {
  const startedAt = getNow();
  const result = await callback();

  recordPerfMetric({
    name,
    durationMs: Math.round(getNow() - startedAt),
    timestamp: Date.now(),
    detail,
  });

  return result;
}
