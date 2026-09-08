import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SambaCard, SambaStateIndicator } from "./SambaCardPrimitives";

describe("SambaCard", () => {
  it("lifts the card surface on hover in dark mode", () => {
    render(<SambaCard data-testid="card">Content</SambaCard>);

    const card = screen.getByTestId("card");
    expect(card.className).toContain("dark:bg-(--background-lighter)");
    expect(card.className).toContain("dark:hover:bg-muted/50");
  });
});

describe("SambaStateIndicator", () => {
  it("renders warning state with an amber indicator", () => {
    const { container } = render(
      <SambaStateIndicator state="warning" warningLabel="Needs attention" />,
    );

    expect(screen.getByText("Needs attention")).toBeTruthy();
    expect(container.querySelector(".text-amber-600")).toBeTruthy();
  });
});
