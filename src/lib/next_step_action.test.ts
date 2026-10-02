import { describe, expect, it } from "vitest";
import {
  isNextStepCommandBlock,
  nextStepActionFromAttributes,
  segmentClosedBlocks,
} from "./next_step_action";
import type { Block } from "@/lib/streamingMessageParser";

function nextStep(id: number, specialist?: string, why?: string): Block {
  return {
    kind: "custom-tag",
    id,
    tag: "samba-command",
    attributes: {
      type: "next-step",
      prompt: `Passo ${id}`,
      ...(specialist ? { specialist } : {}),
      ...(why ? { why } : {}),
    },
    content: "",
    complete: true,
    inProgress: false,
  };
}

describe("next-step attributes", () => {
  it("lê specialist e why", () => {
    expect(
      nextStepActionFromAttributes({
        type: "next-step",
        specialist: "cybersec",
        why: "endpoint novo sem checagem de papel",
        prompt: "Audite autorização do endpoint",
      }),
    ).toEqual({
      id: "next-step",
      specialist: "cybersec",
      why: "endpoint novo sem checagem de papel",
      prompt: "Audite autorização do endpoint",
    });
  });

  it("ignora comandos que não são next-step", () => {
    expect(nextStepActionFromAttributes({ type: "refresh" })).toBeNull();
  });
});

describe("segmentClosedBlocks", () => {
  it("agrupa next-steps consecutivos e ignora markdown em branco", () => {
    const blocks: Block[] = [
      {
        kind: "markdown",
        id: 1,
        content: "Pronto.\n",
        complete: true,
      },
      nextStep(2, "ux-ui", "hierarquia visual ainda irregular"),
      {
        kind: "markdown",
        id: 3,
        content: "\n",
        complete: true,
      },
      nextStep(4, "quality"),
      {
        kind: "custom-tag",
        id: 5,
        tag: "samba-command",
        attributes: { type: "refresh" },
        content: "",
        complete: true,
        inProgress: false,
      },
    ];
    const segments = segmentClosedBlocks(blocks);
    expect(segments).toHaveLength(3);
    expect(segments[0]).toMatchObject({ kind: "single" });
    expect(segments[1]).toMatchObject({ kind: "next-steps" });
    if (segments[1].kind !== "next-steps") throw new Error("expected huddle");
    expect(segments[1].blocks.map((b) => b.id)).toEqual([2, 4]);
    expect(segments[2]).toMatchObject({ kind: "single" });
    expect(isNextStepCommandBlock(blocks[1])).toBe(true);
  });

  it("agrupa samba-say e samba-invite consecutivos", () => {
    const blocks: Block[] = [
      {
        kind: "markdown",
        id: 1,
        content: "Pronto.\n",
        complete: true,
      },
      {
        kind: "custom-tag",
        id: 2,
        tag: "samba-say",
        attributes: { specialist: "ux-ui", about: "done" },
        content: "Ajustei a hierarquia da home.",
        complete: true,
        inProgress: false,
      },
      {
        kind: "markdown",
        id: 3,
        content: "\n",
        complete: true,
      },
      {
        kind: "custom-tag",
        id: 4,
        tag: "samba-invite",
        attributes: {
          from: "ux-ui",
          specialist: "quality",
          prompt: "Cubra a jornada com testes",
        },
        content: "",
        complete: true,
        inProgress: false,
      },
      nextStep(5, "quality"),
    ];
    const segments = segmentClosedBlocks(blocks);
    expect(segments.map((s) => s.kind)).toEqual([
      "single",
      "specialist-talk",
      "next-steps",
    ]);
    if (segments[1].kind !== "specialist-talk") {
      throw new Error("expected talk huddle");
    }
    expect(segments[1].blocks.map((b) => b.id)).toEqual([2, 4]);
  });
});
