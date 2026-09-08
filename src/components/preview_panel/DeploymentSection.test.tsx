import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({ settings: settings.value, updateSettings: vi.fn() }),
}));

// The connectors each open IPC channels and queries of their own; this is
// about which of them the panel puts on screen.
vi.mock("@/components/VercelConnector", () => ({
  VercelConnector: () => <div>vercel-connector</div>,
}));
vi.mock("@/components/AwsConnector", () => ({
  AwsConnector: () => <div>aws-connector</div>,
}));
vi.mock("@/components/CoolifyConnector", () => ({
  CoolifyConnector: () => <div>coolify-connector</div>,
}));
vi.mock("@/ipc/types", () => ({
  ipc: { system: { openExternalUrl: vi.fn() } },
}));

const { DeploymentSection } = await import("./DeploymentSection");

const APP = { name: "demo", githubOrg: "acme", githubRepo: "demo" };

describe("with deployment to your own server turned off", () => {
  it("offers Vercel and AWS without enabling the optional own server", () => {
    settings.value = {};
    render(<DeploymentSection appId={1} app={APP} />);

    expect(screen.getByText("vercel-connector")).toBeTruthy();
    expect(screen.queryByText("coolify-connector")).toBeNull();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Vercel — site simples",
      "AWS — front e backend",
    ]);
    // Not even the name of the thing they did not opt into.
    expect(screen.queryByText(/own server/i)).toBeNull();
  });
});

describe("with it turned on", () => {
  it("offers the optional own server alongside cloud destinations, Vercel first", () => {
    settings.value = { enableOwnServerDeployment: true };
    render(<DeploymentSection appId={1} app={APP} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Vercel — site simples",
      "AWS — front e backend",
      "Your Own Server",
    ]);
    // Vercel is where an app publishes unless the user says otherwise, so it
    // is the tab that opens.
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("vercel-connector")).toBeTruthy();
  });
});
