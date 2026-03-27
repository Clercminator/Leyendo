import { describe, expect, it } from "vitest";

import {
  clearPerfMetrics,
  getPerfMetrics,
  measureAsync,
  measureSync,
} from "@/lib/perf/instrumentation";

describe("performance instrumentation", () => {
  it("records synchronous measurements", () => {
    clearPerfMetrics();

    const value = measureSync(
      "reader.derive-runtime-chunks",
      { cached: false },
      () => 42,
    );

    expect(value).toBe(42);
    expect(getPerfMetrics()).toHaveLength(1);
  });

  it("records asynchronous measurements", async () => {
    clearPerfMetrics();

    const value = await measureAsync(
      "import.build-document",
      { processingMode: "main-thread" },
      async () => "done",
    );

    expect(value).toBe("done");
    expect(getPerfMetrics()).toHaveLength(1);
  });
});
