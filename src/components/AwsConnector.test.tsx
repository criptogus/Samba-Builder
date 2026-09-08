import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  status: vi.fn(),
  review: vi.fn(),
  deploy: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/ipc/types", () => ({
  ipc: { aws: api, system: { openExternalUrl: vi.fn() } },
}));
import { AwsConnector } from "./AwsConnector";
beforeEach(() => {
  vi.clearAllMocks();
  api.status.mockResolvedValue(null);
  api.review.mockResolvedValue({
    accountId: "123456789012",
    identity: "test",
    sourceFiles: 3,
    sourceBytes: 200,
    sourceDigest: "a".repeat(64),
  });
});
async function form() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AwsConnector appId={1} />
    </QueryClientProvider>,
  );
  fireEvent.change(await screen.findByLabelText("Role de execução ECS (ARN)"), {
    target: { value: "arn:aws:iam::123456789012:role/exec" },
  });
  fireEvent.change(screen.getByLabelText("Role de infraestrutura ECS (ARN)"), {
    target: { value: "arn:aws:iam::123456789012:role/infra" },
  });
}
it("requires a fresh account review after changing configuration", async () => {
  await form();
  expect(
    screen.queryByRole("button", { name: "Publicar nesta conta AWS" }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Revisar publicação AWS" }),
  );
  await screen.findByText("Conta 123456789012");
  expect(api.deploy).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Região AWS"), {
    target: { value: "us-west-2" },
  });
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Publicar nesta conta AWS" }),
    ).toBeNull(),
  );
});
it("only deploys the reviewed account and source after the publish click", async () => {
  await form();
  api.deploy.mockImplementation(() => new Promise(() => {}));
  fireEvent.click(
    screen.getByRole("button", { name: "Revisar publicação AWS" }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Publicar nesta conta AWS" }),
  );
  await waitFor(() =>
    expect(api.deploy).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 1,
        accountId: "123456789012",
        sourceDigest: "a".repeat(64),
      }),
    ),
  );
});
