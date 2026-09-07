import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listTemplates: vi.fn(),
  extractTemplate: vi.fn(),
  applyTemplate: vi.fn(),
}));

vi.mock("@/ipc/types", () => ({
  ipc: { designSystem: api },
}));

import { DesignSystemPanelContent } from "./DesignSystemDialog";

beforeEach(() => {
  vi.clearAllMocks();
  api.listTemplates.mockResolvedValue({ templates: [] });
});

function renderPanel(appId = 7) {
  return render(<DesignSystemPanelContent appId={appId} />);
}

it("renders the saved design system templates returned by the CLI list", async () => {
  api.listTemplates.mockResolvedValue({
    templates: [
      {
        slug: "ocean",
        name: "Ocean",
        description: "",
        tags: ["calm", "blue"],
        savedAt: "2026-09-01T00:00:00Z",
        from: "acme-app",
      },
      {
        slug: "ember",
        name: "Ember",
        description: "",
        tags: [],
        savedAt: "",
        from: "",
      },
    ],
  });

  renderPanel();

  expect(await screen.findByText("Ocean")).toBeTruthy();
  expect(screen.getByText("Ember")).toBeTruthy();
  // A row exists per template with an Apply button.
  expect(screen.getAllByRole("button", { name: /Apply/ })).toHaveLength(2);
  expect(api.listTemplates).toHaveBeenCalledTimes(1);
});

it("extracts the current project design system with the given name and refreshes the list", async () => {
  api.listTemplates
    .mockResolvedValueOnce({ templates: [] })
    .mockResolvedValueOnce({
      templates: [
        {
          slug: "ocean",
          name: "Ocean",
          description: "",
          tags: [],
          savedAt: "",
          from: "",
        },
      ],
    });
  api.extractTemplate.mockResolvedValue({ slug: "ocean", name: "Ocean" });

  renderPanel();

  const nameInput = await screen.findByLabelText(
    "Extract this project's design system",
  );
  fireEvent.change(nameInput, { target: { value: "Ocean" } });
  fireEvent.click(screen.getByRole("button", { name: /Extract/ }));

  await waitFor(() =>
    expect(api.extractTemplate).toHaveBeenCalledWith({
      appId: 7,
      name: "Ocean",
    }),
  );
  // The freshly saved template shows up after the list refresh.
  expect(await screen.findByText("Ocean")).toBeTruthy();
  expect(api.listTemplates).toHaveBeenCalledTimes(2);
});

it("surfaces a CLI error message when extraction fails", async () => {
  api.listTemplates.mockResolvedValue({ templates: [] });
  api.extractTemplate.mockRejectedValue(
    new Error("Error invoking remote method 'design-system:extract': Error: boom"),
  );

  renderPanel();

  const nameInput = await screen.findByLabelText(
    "Extract this project's design system",
  );
  fireEvent.change(nameInput, { target: { value: "Ocean" } });
  fireEvent.click(screen.getByRole("button", { name: /Extract/ }));

  const feedback = await screen.findByTestId("design-system-feedback");
  expect(feedback.textContent).toContain("boom");
});
