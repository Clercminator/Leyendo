import { expect, test, type Page } from "@playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const accountEmail = process.env.PLAYWRIGHT_ACCOUNT_EMAIL;
const accountPassword = process.env.PLAYWRIGHT_ACCOUNT_PASSWORD;

const hasAuthE2eConfig = Boolean(
  supabaseUrl && supabaseAnonKey && accountEmail && accountPassword,
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
});
