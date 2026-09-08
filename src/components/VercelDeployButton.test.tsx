import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
const deploy = vi.hoisted(() => vi.fn());
vi.mock("@/ipc/types", () => ({
  ipc: { vercel: { deploy }, system: { openExternalUrl: vi.fn() } },
}));
import { VercelDeployButton } from "./VercelDeployButton";
it("defaults to preview and sends production only after selection", async () => {
  deploy.mockResolvedValue({
    id: "1",
    url: "https://site.vercel.app",
    state: "QUEUED",
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <VercelDeployButton appId={1} />
    </QueryClientProvider>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Criar preview na Vercel" }),
  );
  await waitFor(() =>
    expect(deploy).toHaveBeenCalledWith({ appId: 1, target: "preview" }),
  );
  await screen.findByRole("status");
  fireEvent.click(
    screen.getByRole("button", { name: "Produção — site público" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Publicar em produção na Vercel" }),
  );
  await waitFor(() =>
    expect(deploy).toHaveBeenCalledWith({ appId: 1, target: "production" }),
  );
});
