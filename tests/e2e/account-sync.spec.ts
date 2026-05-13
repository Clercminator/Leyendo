import { expect, test, type Page } from "@playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const accountEmail = process.env.PLAYWRIGHT_ACCOUNT_EMAIL;
const accountPassword = process.env.PLAYWRIGHT_ACCOUNT_PASSWORD;

const hasAuthE2eConfig = Boolean(
  supabaseUrl && supabasePublicKey && accountEmail && accountPassword,
);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function signIn(page: Page) {
  await page.goto("/account");

  await page.getByLabel(/^email$/i).fill(accountEmail ?? "");
  await page.getByLabel(/password/i).fill(accountPassword ?? "");
  await page.getByRole("button", { name: /^sign in$/i }).click();

  await expect(page.getByText(accountEmail ?? "").first()).toBeVisible({
    timeout: 15_000,
  });
}

async function getProfileReaderTheme(page: Page) {
  return page.evaluate(() => {
    return window.__LEYENDO_E2E_AUTH__?.getProfileReaderTheme() ?? null;
  });
}

async function refreshProfileForE2E(page: Page) {
  return page.evaluate(async () => {
    const auth = window.__LEYENDO_E2E_AUTH__;

    if (!auth) {
      throw new Error("Missing Leyendo e2e auth hook.");
    }

    await auth.refreshProfile();

    return auth.getProfileReaderTheme() ?? null;
  });
}

test.describe("account sync", () => {
  test.skip(!hasAuthE2eConfig, "Auth e2e env vars are not configured.");

  test("signed-in users can reopen a synced document and reader setup in a second browser context", async ({
    browser,
  }) => {
    const uniqueId = `${Date.now()}`;
    const title = `Cross-device sync ${uniqueId}`;
    const documentText = `Cross-device sync sample ${uniqueId}. This document should appear on another signed-in device without being uploaded again.`;
    const titleMatcher = new RegExp(escapeRegExp(title), "i");

    const deviceA = await browser.newContext();
    const deviceB = await browser.newContext();
    const pageA = await deviceA.newPage();
    const pageB = await deviceB.newPage();

    await signIn(pageA);

    await pageA.goto("/");
    await pageA.getByLabel(/document title/i).fill(title);
    await pageA
      .getByRole("textbox", { name: /^paste text$/i })
      .fill(documentText);
    await pageA.getByRole("button", { name: /open in reader/i }).click();

    await expect(pageA).toHaveURL(/\/reader\?document=/);
    await expect(pageA.getByLabel(/reader canvas/i)).toBeVisible();

    await pageA.getByRole("button", { name: /playback settings/i }).click();
    await pageA.getByRole("button", { name: /decrease chunk size/i }).click();
    await pageA
      .getByRole("button", { name: /increase reading speed/i })
      .click();
    await expect(
      pageA.getByRole("button", { name: /playback settings/i }),
    ).toContainText(/300 WPM/i);
    await expect(
      pageA.getByRole("button", { name: /playback settings/i }),
    ).toContainText(/1 word/i);

    await pageA.getByRole("button", { name: /change theme/i }).click();
    await pageA.getByRole("button", { name: /^ember$/i }).click();
    await expect(
      pageA.getByRole("button", { name: /change theme/i }),
    ).toContainText(/ember/i);

    await pageA.waitForTimeout(800);

    await signIn(pageB);

    await expect(pageB.getByText(accountEmail ?? "").first()).toBeVisible({
      timeout: 15_000,
    });

    await pageB.goto("/library");
    await expect(
      pageB.getByRole("heading", { name: titleMatcher }),
    ).toBeVisible({
      timeout: 15_000,
    });

    const syncedDocumentCard = pageB.locator("article").filter({
      has: pageB.getByRole("heading", { name: titleMatcher }),
    });

    await syncedDocumentCard.getByRole("link", { name: /^open$/i }).click();

    await expect(pageB).toHaveURL(/\/reader\?document=/);
    await expect(
      pageB.getByRole("button", { name: /playback settings/i }),
    ).toContainText(/300 WPM/i);
    await expect(
      pageB.getByRole("button", { name: /playback settings/i }),
    ).toContainText(/1 word/i);
    await expect(
      pageB.getByRole("button", { name: /change theme/i }),
    ).toContainText(/ember/i);

    await pageB.goto("/library");
    await syncedDocumentCard
      .getByRole("button", {
        name: new RegExp(`remove ${escapeRegExp(title)} from this device`, "i"),
      })
      .click();
    await expect(
      pageB.getByRole("heading", { name: titleMatcher }),
    ).toHaveCount(0);

    await deviceA.close();
    await deviceB.close();
  });

  test("signed-in users keep Midnight selected after a stale profile refresh and sync it to a second browser context", async ({
    browser,
  }) => {
    const uniqueId = `${Date.now()}`;
    const title = `Midnight regression ${uniqueId}`;
    const documentText = `Midnight regression sample ${uniqueId}. This reader should stay on Midnight after a stale signed-in profile refresh.`;
    const titleMatcher = new RegExp(escapeRegExp(title), "i");

    const deviceA = await browser.newContext();
    const deviceB = await browser.newContext();
    const pageA = await deviceA.newPage();
    const pageB = await deviceB.newPage();

    await signIn(pageA);

    await pageA.goto("/");
    await pageA.getByLabel(/document title/i).fill(title);
    await pageA
      .getByRole("textbox", { name: /^paste text$/i })
      .fill(documentText);
    await pageA.getByRole("button", { name: /open in reader/i }).click();

    await expect(pageA).toHaveURL(/\/reader\?document=/);
    await expect(pageA.getByLabel(/reader canvas/i)).toBeVisible();

    const themeButton = pageA.getByRole("button", { name: /change theme/i });

    await expect
      .poll(async () => {
        return pageA.evaluate(() => {
          return typeof window.__LEYENDO_E2E_AUTH__?.refreshProfile;
        });
      })
      .toBe("function");

    await themeButton.click();
    await pageA.getByRole("button", { name: /^indigo$/i }).click();
    await expect(themeButton).toContainText(/indigo/i);

    await expect.poll(async () => getProfileReaderTheme(pageA)).toBe(
      "indigo",
    );

    await themeButton.click();
    await pageA.getByRole("button", { name: /^midnight$/i }).click();
    await expect(themeButton).toContainText(/midnight/i);

    await expect(await refreshProfileForE2E(pageA)).toBe("indigo");
    await expect(themeButton).toContainText(/midnight/i);

    await expect.poll(async () => getProfileReaderTheme(pageA)).toBe(
      "midnight",
    );
    await expect(themeButton).toContainText(/midnight/i);

    await signIn(pageB);

    await pageB.goto("/library");
    await expect(
      pageB.getByRole("heading", { name: titleMatcher }),
    ).toBeVisible({
      timeout: 15_000,
    });

    const syncedDocumentCard = pageB.locator("article").filter({
      has: pageB.getByRole("heading", { name: titleMatcher }),
    });

    await syncedDocumentCard.getByRole("link", { name: /^open$/i }).click();

    await expect(pageB).toHaveURL(/\/reader\?document=/);
    await expect(
      pageB.getByRole("button", { name: /change theme/i }),
    ).toContainText(/midnight/i);

    await pageB.goto("/library");
    await syncedDocumentCard
      .getByRole("button", {
        name: new RegExp(`remove ${escapeRegExp(title)} from this device`, "i"),
      })
      .click();
    await expect(
      pageB.getByRole("heading", { name: titleMatcher }),
    ).toHaveCount(0);

    await deviceA.close();
    await deviceB.close();
  });
});
