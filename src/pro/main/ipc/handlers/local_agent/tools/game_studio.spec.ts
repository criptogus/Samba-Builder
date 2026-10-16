import { expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: { getPath: () => "" },
}));

import { SambaError } from "@/errors/samba_error";
import { importGameSkillTool, inspectGameComputerTool } from "./game_studio";

it("exige um único alvo para importar a skill", async () => {
  await expect(
    importGameSkillTool.execute({}, {} as never),
  ).rejects.toBeInstanceOf(SambaError);
  await expect(
    importGameSkillTool.execute(
      { discovery_id: "abc12345abc12345", bundled_slug: "construtor-de-jogos" },
      {} as never,
    ),
  ).rejects.toBeInstanceOf(SambaError);
});

it("não conta a importação como mutação do app", () => {
  expect(importGameSkillTool.modifiesState).toBe(true);
  expect(importGameSkillTool.mutationTracking).toBe("none");
  expect(importGameSkillTool.requiresBlueprintApproval).toBe(false);
  expect(inspectGameComputerTool.modifiesState).toBeUndefined();
  expect(inspectGameComputerTool.defaultConsent).toBe("always");
});
