import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("posthog-js/react", () => ({
  usePostHog: () => ({ captureException: vi.fn() }),
}));
vi.mock("@/ipc/types", () => ({
  ipc: { system: { openExternalUrl: vi.fn() } },
}));

import { ErrorBoundary } from "./ErrorBoundary";

afterEach(cleanup);

it.each([new Error("route failed"), "route failed"])(
  "renders route errors with an unknown router error type: %s",
  (error) => {
    const logging = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      render(<ErrorBoundary error={error} reset={vi.fn()} />);
      expect(screen.getByText("route failed")).toBeTruthy();
    } finally {
      logging.mockRestore();
    }
  },
);
