import type { NextStepAction } from "@/lib/schemas";
import type { Block } from "@/lib/streamingMessageParser";

export function nextStepActionFromAttributes(
  attributes: Record<string, string>,
): NextStepAction | null {
  if (attributes.type !== "next-step" || !attributes.prompt?.trim()) {
    return null;
  }
  return {
    id: "next-step",
    prompt: attributes.prompt,
    ...(attributes.specialist ? { specialist: attributes.specialist } : {}),
    ...(attributes.why ? { why: attributes.why } : {}),
  };
}

export function isNextStepCommandBlock(block: Block): boolean {
  return (
    block.kind === "custom-tag" &&
    block.tag === "samba-command" &&
    nextStepActionFromAttributes(block.attributes) !== null
  );
}

export function isBlankMarkdownBlock(block: Block): boolean {
  return block.kind === "markdown" && block.content.trim().length === 0;
}

export type ClosedBlockSegment =
  | { kind: "single"; block: Block }
  | { kind: "next-steps"; blocks: Block[] };

/**
 * Agrupa next-steps consecutivos (ignorando markdown em branco entre eles)
 * para renderizar o huddle dos especialistas como um único bloco.
 */
export function segmentClosedBlocks(blocks: Block[]): ClosedBlockSegment[] {
  const segments: ClosedBlockSegment[] = [];
  let i = 0;
  while (i < blocks.length) {
    if (isNextStepCommandBlock(blocks[i])) {
      const grouped: Block[] = [blocks[i]];
      let j = i + 1;
      while (j < blocks.length) {
        if (isNextStepCommandBlock(blocks[j])) {
          grouped.push(blocks[j]);
          j += 1;
          continue;
        }
        if (isBlankMarkdownBlock(blocks[j])) {
          j += 1;
          continue;
        }
        break;
      }
      segments.push({ kind: "next-steps", blocks: grouped });
      i = j;
      continue;
    }
    segments.push({ kind: "single", block: blocks[i] });
    i += 1;
  }
  return segments;
}
