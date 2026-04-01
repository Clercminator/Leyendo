import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LandingReaderDemo } from "@/components/reader/landing-reader-demo";

vi.mock("@/components/layout/locale-provider", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale: vi.fn(),
  }),
}));

describe("LandingReaderDemo", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders the sample article inside a live reader and lets visitors switch modes", async () => {
    const user = userEvent.setup();

    render(<LandingReaderDemo />);

    expect(
      screen.getByRole("heading", {
        name: /use a live sample before you import your own document/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/reader canvas/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /why reading deeply and reading faster can work together/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/standard pdf mode is not part of this sample/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /change reading mode/i }),
    );
    await user.click(screen.getByRole("button", { name: /^classic reader$/i }));

    const readerCanvas = screen.getByLabelText(/reader canvas/i);

    expect(
      screen.getByLabelText(/classic reader document/i),
    ).toBeInTheDocument();
    expect(readerCanvas.className).toContain("min-h-232");
    expect(readerCanvas.className).not.toContain("h-[58rem]");
    expect(screen.getAllByText(/the practical payoff/i).length).toBeGreaterThan(
      0,
    );
  });
});
