import { defineConfig, devices } from "@playwright/test";

const playwrightServerMode = process.env.PLAYWRIGHT_SERVER_MODE ?? "all";
const webServer = [];

if (playwrightServerMode !== "production") {
  webServer.push({
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  });
}

if (playwrightServerMode !== "dev") {
  webServer.push({
    command: "pnpm build && pnpm exec next start --hostname 127.0.0.1 --port 3001",
    timeout: 1_200_000,
    url: "http://127.0.0.1:3001",
    reuseExistingServer: !process.env.CI,
  });
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:3000",
    locale: "en-US",
    trace: "on-first-retry",
  },
  webServer,
  projects: [
    {
      name: "chromium",
      grepInvert: /@mobile|@production/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      grep: /@mobile/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "chromium-production",
      grep: /@production/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:3001",
      },
    },
  ],
});
