import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EvidenceGates } from "./EvidenceGates";
import { emptyDeliveryPlan, type DeliveryPlan } from "@/delivery/model";
import { EngineeringPolicySchema } from "@/delivery/quality";

const policy = (profile: "public" | "private" | "critical") =>
  EngineeringPolicySchema.parse({
    version: 1,
    profile,
    requirements: [],
    peakUsers: 100,
    availabilityPercent: 99,
    recoveryMinutes: 60,
    dataLossMinutes: 1440,
    monthlyBudgetUSD: 100,
    maxLcpMs: 2500,
    maxCls: 0.1,
    architectureEvidence: "",
    usabilityEvidence: "",
  });

const planWith = (
  profile: "public" | "private" | "critical",
): DeliveryPlan => ({
  ...emptyDeliveryPlan(),
  engineeringPolicy: policy(profile),
});

describe("EvidenceGates", () => {
  it("não renderiza nada sem política de engenharia (sem perfil de risco)", () => {
    const { container } = render(
      <EvidenceGates plan={emptyDeliveryPlan()} onChange={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("mostra os gates obrigatórios do perfil e o perfil ativo", () => {
    render(<EvidenceGates plan={planWith("public")} onChange={() => {}} />);
    expect(screen.getByText("Gates de evidência")).toBeTruthy();
    expect(screen.getByText("Público — landing/institucional")).toBeTruthy();
    expect(screen.getByText("Testes executados")).toBeTruthy();
    expect(
      screen.getByText("Segurança (segredos, dependências, autorização)"),
    ).toBeTruthy();
    // Perfil public NÃO exige acessibilidade.
    expect(screen.queryByText("Acessibilidade (WCAG AA)")).toBeNull();
  });

  it("perfil critical exige mais gates (aprovação, arquitetura, performance)", () => {
    render(<EvidenceGates plan={planWith("critical")} onChange={() => {}} />);
    expect(
      screen.getByText("Aprovação humana vinculada à versão"),
    ).toBeTruthy();
    expect(screen.getByText("Arquitetura (ADR, contratos, mapa)")).toBeTruthy();
    expect(screen.getByText("Performance e resiliência")).toBeTruthy();
  });

  it("registra um gate e chama onChange com o item no plano", () => {
    const onChange = vi.fn();
    render(<EvidenceGates plan={planWith("public")} onChange={onChange} />);
    const textareas = screen.getAllByPlaceholderText(
      "O que foi verificado e o resultado observado",
    );
    fireEvent.change(textareas[0], {
      target: { value: "23 testes unitários passaram" },
    });
    const inputs = screen.getAllByPlaceholderText(
      "Comando executado (ex.: npm run test:unit)",
    );
    fireEvent.change(inputs[0], { target: { value: "npm test" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Registrar" })[0]);

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as DeliveryPlan;
    expect(next.evidenceItems).toHaveLength(1);
    expect(next.evidenceItems[0].gate).toBe("tests");
    expect(next.evidenceItems[0].summary).toBe("23 testes unitários passaram");
    expect(next.evidenceItems[0].command).toBe("npm test");
    expect(next.evidenceItems[0].status).toBe("passed");
    expect(next.evidenceItems[0].by).toBe("human");
  });

  it("mostra os bloqueios dos gates sem evidência", () => {
    render(<EvidenceGates plan={planWith("critical")} onChange={() => {}} />);
    expect(
      screen.getAllByText(/Gate "tests" sem evidência/).length,
    ).toBeGreaterThan(0);
  });
});
