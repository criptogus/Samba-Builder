import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/main/settings", () => ({
  readSettings: vi.fn(() => ({})),
  writeSettings: vi.fn(),
}));

import { readSettings } from "@/main/settings";
import { refreshNeonToken } from "./neon_management_client";

describe("refreshNeonToken", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is a no-op and never calls the retired Dyad refresh endpoint", async () => {
    vi.mocked(readSettings).mockReturnValue({
      neon: {
        refreshToken: { value: "rotating-refresh-token" },
        expiresIn: 1,
        tokenTimestamp: 0,
      },
    } as ReturnType<typeof readSettings>);
    vi.stubGlobal("fetch", vi.fn());

    await refreshNeonToken();

    // Token refresh used to round-trip through the retired Dyad OAuth proxy.
    // Connections are now direct long-lived Neon API keys, so refreshing must
    // never hit the network.
    expect(fetch).not.toHaveBeenCalled();
  });
});
