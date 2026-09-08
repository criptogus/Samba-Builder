import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ProductCoachDialog from "./ProductCoachDialog";
beforeEach(() => localStorage.clear());
afterEach(cleanup);
const mount = (key = "chat:1", idea = "") => {
  const prepared = vi.fn();
  const close = vi.fn();
  const view = render(
    <ProductCoachDialog
      draftKey={key}
      idea={idea}
      onClose={close}
      onPrepared={prepared}
    />,
  );
  return { ...view, prepared, close };
};
it("explains questions, retains unknowns, and prepares a brief only after review", () => {
  const view = mount("chat:1", "Organizar agendas");
  expect(
    screen.getByLabelText("Qual problema vale a pena resolver?"),
  ).toHaveProperty("value", "Organizar agendas");
  expect(view.prepared).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Próxima pergunta"));
  expect(screen.getByText(/Quem usa pode ser diferente/)).toBeTruthy();
  fireEvent.click(screen.getByText("Ainda não sei"));
  fireEvent.click(screen.getByText("Revisar o que já respondi"));
  expect(screen.getByRole("status").textContent).toContain(
    "Revisão do briefing",
  );
  fireEvent.click(screen.getByText("Levar briefing ao chat"));
  expect(view.prepared).toHaveBeenCalledWith(
    expect.stringContaining("decisão pendente"),
  );
  expect(view.prepared).toHaveBeenCalledWith(
    expect.stringContaining("não implemente código"),
  );
  expect(view.close).toHaveBeenCalledOnce();
});
it("adds relevant follow-up questions and restores answers only for the matching draft", () => {
  let view = mount();
  fireEvent.change(
    screen.getByLabelText("Qual problema vale a pena resolver?"),
    { target: { value: "Problema da equipe A" } },
  );
  for (let i = 0; i < 4; i++)
    fireEvent.click(
      screen.getByText(i === 0 ? "Próxima pergunta" : "Ainda não sei"),
    );
  fireEvent.click(screen.getByLabelText(/Vendas ou pagamentos/));
  fireEvent.click(screen.getByText("Próxima pergunta"));
  expect(
    screen.getByLabelText(
      "Como será a cobrança e o que acontece se ela falhar?",
    ),
  ).toBeTruthy();
  view.unmount();
  view = mount();
  expect(
    screen.getByLabelText("Qual problema vale a pena resolver?"),
  ).toHaveProperty("value", "Problema da equipe A");
  view.unmount();
  mount("chat:2");
  expect(
    screen.getByLabelText("Qual problema vale a pena resolver?"),
  ).toHaveProperty("value", "");
});
