"use client";

import { track } from "@vercel/analytics";

import type { ReaderAdMetricContext } from "@/lib/reader-ads";

export type ReaderAdMetricName =
  | "reader_ad_break_shown"
  | "reader_ad_break_started"
  | "reader_ad_break_completed"
  | "reader_ad_break_failed"
  | "reader_ad_bounced_after_break"
  | "reader_ad_upgrade_after_break";

export function trackReaderAdMetric(
  name: ReaderAdMetricName,
  context: ReaderAdMetricContext,
  extra?: Record<string, boolean | number | string | undefined>,
) {
  try {
    void track(name, {
      ...context,
      ...extra,
    });
  } catch {
    // Analytics must stay best-effort so reader behavior never depends on it.
  }
}
