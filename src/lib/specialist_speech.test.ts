import { describe, expect, it } from "vitest";
import type { Block } from "@/lib/streamingMessageParser";
import {
  isSpecialistTalkBlock,
  specialistInviteFromBlock,
  specialistSayFromBlock,
} from "./specialist_speech";

function tag(
  id: number,
  name: string,
  attributes: Record<string, string>,
  content = "",
): Block {
  return {
    kind: "custom-tag",
    id,
    tag: name,
    attributes,
    content,
    complete: true,
    inProgress: false,
  };
}

describe("specialist speech tags", () => {
  it("lê samba-say com about default done", () => {
    expect(
      specialistSayFromBlock(
        tag(
          1,
          "samba-say",
          { specialist: "cybersec" },
          "Olhei o endpoint novo: a rota existe, mas ainda não checa papel.",
        ),
      ),
    ).toEqual({
      specialist: "cybersec",
      about: "done",
      body: "Olhei o endpoint novo: a rota existe, mas ainda não checa papel.",
    });
  });

  it("lê samba-say about=next e ignora especialista desconhecido", () => {
    expect(
      specialistSayFromBlock(
        tag(
          1,
          "samba-say",
          { specialist: "ux-ui", about: "next" },
          "Falta a revisão visual.",
        ),
      )?.about,
    ).toBe("next");
    expect(
      specialistSayFromBlock(
        tag(1, "samba-say", { specialist: "wizard" }, "oi"),
      ),
    ).toBeNull();
    expect(
      specialistSayFromBlock(
        tag(1, "samba-say", { specialist: "quality" }, "  "),
      ),
    ).toBeNull();
  });

  it("lê samba-invite e exige prompt + especialista válido", () => {
    expect(
      specialistInviteFromBlock(
        tag(1, "samba-invite", {
          from: "ux-ui",
          specialist: "quality",
          why: "as telas mudaram e a jornada ainda nao tem e2e",
          prompt: "Cubra a jornada de onboarding com testes",
        }),
      ),
    ).toEqual({
      from: "ux-ui",
      specialist: "quality",
      why: "as telas mudaram e a jornada ainda nao tem e2e",
      prompt: "Cubra a jornada de onboarding com testes",
    });
    expect(
      specialistInviteFromBlock(
        tag(1, "samba-invite", {
          specialist: "quality",
          prompt: "Cubra a jornada",
        }),
      ),
    ).toMatchObject({ specialist: "quality", prompt: "Cubra a jornada" });
    expect(
      specialistInviteFromBlock(
        tag(1, "samba-invite", { specialist: "quality" }),
      ),
    ).toBeNull();
  });

  it("reconhece blocos de fala e convite", () => {
    expect(
      isSpecialistTalkBlock(
        tag(
          1,
          "samba-say",
          { specialist: "pm" },
          "Fechei o escopo desta versao.",
        ),
      ),
    ).toBe(true);
    expect(
      isSpecialistTalkBlock(
        tag(1, "samba-invite", {
          specialist: "cybersec",
          prompt: "Audite o endpoint",
        }),
      ),
    ).toBe(true);
    expect(
      isSpecialistTalkBlock(
        tag(1, "samba-command", { type: "next-step", prompt: "x" }),
      ),
    ).toBe(false);
  });
});
