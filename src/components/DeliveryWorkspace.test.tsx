vi.mock("./DeliveryAttention", () => ({ DeliveryAttention: () => null }));
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeliveryWorkspace } from "./DeliveryWorkspace";

const state = vi.hoisted(() => ({
  apps: [] as Array<Record<string, unknown>>,
  loading: false,
  error: null as Error | null,
  refreshApps: vi.fn(),
  openApp: vi.fn(),
}));
vi.mock("@/hooks/useLoadApps", () => ({ useLoadApps: () => state }));
vi.mock("@/hooks/useOpenApp", () => ({ useOpenApp: () => state.openApp }));
vi.mock("@/hooks/useAppCollections", () => ({
  useAppCollections: () => ({ collections: [{ id: 4, name: "Acme" }] }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe("DeliveryWorkspace", () => {
  beforeEach(() => {
    state.loading = false;
    state.error = null;
    vi.clearAllMocks();
    state.apps = [
      {
        id: 1,
        name: "Client portal",
        updatedAt: new Date("2026-08-01"),
        collectionId: 4,
        isFavorite: true,
      },
      {
        id: 2,
        name: "Booking",
        updatedAt: new Date("2026-09-01"),
        collectionId: null,
        isFavorite: false,
      },
    ];
  });
  it("opens real projects and sorts by update date", () => {
    render(<DeliveryWorkspace />);
    expect(screen.getAllByRole("listitem")[0].textContent).toContain("Booking");
    fireEvent.click(screen.getByRole("button", { name: /Client portal/ }));
    expect(state.openApp).toHaveBeenCalledWith(1);
  });
  it("searches collection names and combines search with favorites", () => {
    render(<DeliveryWorkspace />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "acme" },
    });
    expect(screen.queryByText("Booking")).toBeNull();
    expect(screen.getByText("Client portal")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "delivery.favorites" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Booking" },
    });
    expect(screen.getByText("delivery.noResults")).toBeTruthy();
  });
  it("distinguishes an empty workspace from a load failure and can retry", () => {
    state.apps = [];
    const { rerender } = render(<DeliveryWorkspace />);
    expect(screen.getByText("delivery.empty")).toBeTruthy();
    state.error = new Error("Unavailable");
    rerender(<DeliveryWorkspace />);
    expect(screen.queryByText("delivery.empty")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "delivery.retry" }));
    expect(state.refreshApps).toHaveBeenCalledOnce();
  });
  it("bounds large project lists and reveals more on request", () => {
    state.apps = Array.from({ length: 20 }, (_, id) => ({
      id,
      name: `Project ${id}`,
      updatedAt: new Date(),
      isFavorite: false,
    }));
    render(<DeliveryWorkspace />);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "delivery.more" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(18);
  });
});
