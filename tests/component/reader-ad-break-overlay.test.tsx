import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReaderAdBreakOverlay } from "@/components/reader/reader-ad-break-overlay";

const { providerStart } = vi.hoisted(() => ({
  providerStart: vi.fn(),
}));

vi.mock("@/components/reader/reader-ad-provider", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  return {
    ReaderAdProvider: React.forwardRef(function MockReaderAdProvider(
      _props: object,
      ref: React.ForwardedRef<{ start: () => Promise<void> }>,
    ) {
      React.useImperativeHandle(ref, () => ({
        start: providerStart,
      }));

      return <div data-testid="mock-reader-ad-provider" />;
    }),
  };
});

describe("ReaderAdBreakOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    providerStart.mockResolvedValue(undefined);
  });

  it("starts the provider from the prompt action without changing the underlying UI contract", async () => {
    const user = userEvent.setup();
    const onBeginAdBreak = vi.fn();

    render(
      <ReaderAdBreakOverlay
        adTagUrl="https://example.com/test-vast"
        consentRegion="other"
        consentState="unknown"
        demandMode="test"
        isOpen
        locale="en"
        onAdCompleted={vi.fn()}
        onAdFailed={vi.fn()}
        onBeginAdBreak={onBeginAdBreak}
        onAdStarted={vi.fn()}
        onConsentDenied={vi.fn()}
        onConsentGranted={vi.fn()}
        onUpgradeClick={vi.fn()}
        phase="prompt"
        provider="ima"
        upgradeHref="/pricing"
      />,
    );

    await user.click(screen.getByRole("button", { name: /continue reading/i }));

    expect(onBeginAdBreak).toHaveBeenCalledTimes(1);
    expect(providerStart).toHaveBeenCalledTimes(1);
  });

  it("starts the provider immediately after consent is granted for live demand", async () => {
    const user = userEvent.setup();
    const onConsentGranted = vi.fn();
    const onBeginAdBreak = vi.fn();

    render(
      <ReaderAdBreakOverlay
        adTagUrl="https://example.com/live-vast"
        consentRegion="uk"
        consentState="unknown"
        demandMode="live"
        isOpen
        locale="en"
        onAdCompleted={vi.fn()}
        onAdFailed={vi.fn()}
        onBeginAdBreak={onBeginAdBreak}
        onAdStarted={vi.fn()}
        onConsentDenied={vi.fn()}
        onConsentGranted={onConsentGranted}
        onUpgradeClick={vi.fn()}
        phase="consent"
        provider="ima"
        upgradeHref="/pricing"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /allow sponsored breaks/i }),
    );

    expect(onConsentGranted).toHaveBeenCalledTimes(1);
    expect(providerStart).toHaveBeenCalledTimes(1);
    expect(onBeginAdBreak).not.toHaveBeenCalled();
  });
});
