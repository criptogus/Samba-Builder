import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatErrorBox } from "./ChatErrorBox";

const mocks = vi.hoisted(() => ({
  openExternalUrl: vi.fn(),
}));

vi.mock("@/ipc/types", () => ({
  ipc: { system: { openExternalUrl: mocks.openExternalUrl } },
}));

vi.mock("@/hooks/useFreeAgentQuota", () => ({
  useFreeAgentQuota: () => ({
    messagesLimit: 10,
    resetTime: null,
  }),
}));

vi.mock("@/hooks/useFreeModelQuota", () => ({
  useFreeModelQuota: () => ({
    messagesLimit: 5,
    resetTime: null,
  }),
}));

vi.mock("@/hooks/useUserBudgetInfo", () => ({
  useUserBudgetInfo: () => ({ userBudget: null }),
}));

describe("ChatErrorBox Basic Agent quota error", () => {
  beforeEach(() => {
    mocks.openExternalUrl.mockReset();
  });

  it("explains the Basic Agent quota and offers a Build switch without upgrade", () => {
    const onDismiss = vi.fn();
    const onSwitchToBuildMode = vi.fn();

    render(
      <ChatErrorBox
        error='{"type":"FREE_AGENT_QUOTA_EXCEEDED","resetTime":1787295600000}'
        isSambaProEnabled={false}
        onDismiss={onDismiss}
        onSwitchToBuildMode={onSwitchToBuildMode}
      />,
    );

    expect(
      screen.getByText(/used all 10 free Basic Agent messages/),
    ).toBeTruthy();
    expect(screen.getByText(/Your quota resets at/)).toBeTruthy();

    // Samba Builder: sem upgrade/assinatura — só a ação útil de trocar de modo.
    expect(screen.queryByText(/Upgrade to Samba Builder/)).toBeNull();
    expect(mocks.openExternalUrl).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Switch to Build" }));
    expect(onSwitchToBuildMode).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("keeps the quota message actionable without a Build switch when unavailable", () => {
    render(
      <ChatErrorBox
        error='{"type":"FREE_AGENT_QUOTA_EXCEEDED","resetTime":1787295600000}'
        isSambaProEnabled={false}
        onDismiss={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/used all 10 free Basic Agent messages/),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Switch to Build" }),
    ).toBeNull();
  });
});

describe("ChatErrorBox error presentation", () => {
  it("bounds long string errors in a scrollable region", () => {
    render(
      <ChatErrorBox
        error={`Implementer failures:\n${"Detailed failure line\n".repeat(200)}`}
        isSambaProEnabled
        onDismiss={vi.fn()}
      />,
    );

    const scrollRegion = screen
      .getByTestId("chat-error-box")
      .querySelector(".overflow-y-auto");
    expect(scrollRegion?.className).toContain("max-h-64");
    expect(scrollRegion?.className).toContain("scrollbar-on-hover");
  });
});
