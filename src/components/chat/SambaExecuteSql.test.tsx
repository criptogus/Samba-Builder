import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SambaExecuteSql } from "./SambaExecuteSql";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        changesDatabaseSchema: "Changes database schema",
        destructiveDataChange: "Destructive data change",
      })[key] ?? key,
  }),
}));

describe("SambaExecuteSql", () => {
  it("shows a schema mutation indicator for DDL", () => {
    render(<SambaExecuteSql>CREATE TABLE users (id bigint);</SambaExecuteSql>);

    expect(screen.getByText("Changes database schema")).toBeTruthy();
  });

  it("extracts SQL text from string children mixed with React nodes", () => {
    render(
      <SambaExecuteSql>
        {"CREATE "}
        <span>ignored</span>
        {"TABLE users (id bigint);"}
      </SambaExecuteSql>,
    );

    expect(screen.getByText("Changes database schema")).toBeTruthy();
  });

  it("omits the schema mutation indicator for ordinary queries", () => {
    render(<SambaExecuteSql>SELECT * FROM users;</SambaExecuteSql>);

    expect(screen.queryByText("Changes database schema")).toBeNull();
  });

  it("shows a destructive data indicator for deletes", () => {
    render(<SambaExecuteSql>DELETE FROM users WHERE id = 1;</SambaExecuteSql>);

    expect(screen.getByText("Destructive data change")).toBeTruthy();
  });
});
