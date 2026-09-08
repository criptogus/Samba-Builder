import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const api = vi.hoisted(() => ({
  prepareProjectTemplate: vi.fn(),
  publishProjectTemplate: vi.fn(),
  discardTemplateDraft: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@/ipc/types", () => ({ ipc: { template: api } }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => api.navigate }));
import SaveProjectTemplateDialog from "./SaveProjectTemplateDialog";
const draft = {
  id: "9e9674ad-184f-4bcf-a12d-3f26c2ad975a",
  title: "Portal",
  description: "Base",
  files: [
    {
      path: "src/App.tsx",
      size: 100,
      executable: false,
      digest: "a".repeat(64),
    },
  ],
  excluded: 3,
  createdAt: new Date().toISOString(),
};
beforeEach(() => {
  vi.clearAllMocks();
  api.prepareProjectTemplate.mockResolvedValue(draft);
  api.publishProjectTemplate.mockResolvedValue({});
  api.discardTemplateDraft.mockResolvedValue(undefined);
});
afterEach(cleanup);
function mount() {
  const close = vi.fn();
  const view = render(
    <QueryClientProvider client={new QueryClient()}>
      <SaveProjectTemplateDialog appId={7} name="Portal" onClose={close} />
    </QueryClientProvider>,
  );
  return { ...view, close };
}
async function review() {
  fireEvent.change(screen.getByLabelText("Descrição e uso recomendado"), {
    target: { value: "Base" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Revisar arquivos" }));
  await screen.findByRole("list", { name: "Arquivos do template" });
}
it("requires review before publishing and navigates to the catalog after success", async () => {
  const { close } = mount();
  await review();
  expect(api.prepareProjectTemplate).toHaveBeenCalledWith({
    appId: 7,
    title: "Portal",
    description: "Base",
  });
  expect(api.publishProjectTemplate).not.toHaveBeenCalled();
  expect(
    (
      screen.getByRole("button", {
        name: "Publicar template",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Publicar template" }));
  await waitFor(() =>
    expect(api.publishProjectTemplate).toHaveBeenCalledWith({ id: draft.id }),
  );
  await waitFor(() =>
    expect(api.navigate).toHaveBeenCalledWith({ to: "/templates" }),
  );
  expect(close).toHaveBeenCalledTimes(1);
});
it("keeps the reviewed draft available when GitHub rejects publication", async () => {
  api.publishProjectTemplate.mockRejectedValue(new Error("GitHub HTTP 403"));
  const { close } = mount();
  await review();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Publicar template" }));
  expect((await screen.findByRole("alert")).textContent).toContain("403");
  expect(close).not.toHaveBeenCalled();
  expect(
    screen.getByRole("list", { name: "Arquivos do template" }).textContent,
  ).toContain("src/App.tsx");
});
it("discards a reviewed copy when leaving and never uploads it", async () => {
  const { unmount } = mount();
  await review();
  unmount();
  expect(api.discardTemplateDraft).toHaveBeenCalledWith({ id: draft.id });
  expect(api.publishProjectTemplate).not.toHaveBeenCalled();
});
it("discards late preparation results after the dialog is removed", async () => {
  let resolve!: (value: typeof draft) => void;
  api.prepareProjectTemplate.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const { unmount } = mount();
  fireEvent.change(screen.getByLabelText("Descrição e uso recomendado"), {
    target: { value: "Base" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Revisar arquivos" }));
  await waitFor(() =>
    expect(api.prepareProjectTemplate).toHaveBeenCalledTimes(1),
  );
  unmount();
  resolve(draft);
  await waitFor(() =>
    expect(api.discardTemplateDraft).toHaveBeenCalledWith({ id: draft.id }),
  );
});
