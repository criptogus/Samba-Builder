import type { NextStepAction } from "@/lib/schemas";
import { isSpecialistTalkBlock } from "@/lib/specialist_speech";
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
  | { kind: "next-steps"; blocks: Block[] }
  | { kind: "specialist-talk"; blocks: Block[] };

function groupWhile(
  blocks: Block[],
  start: number,
  matches: (block: Block) => boolean,
): { grouped: Block[]; nextIndex: number } {
  const grouped: Block[] = [blocks[start]];
  let j = start + 1;
  while (j < blocks.length) {
    if (matches(blocks[j])) {
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
  return { grouped, nextIndex: j };
}

/**
 * Agrupa falas/convites e next-steps consecutivos (ignorando markdown em branco)
 * para o huddle dos especialistas no chat.
 */
export function segmentClosedBlocks(blocks: Block[]): ClosedBlockSegment[] {
  const segments: ClosedBlockSegment[] = [];
  let i = 0;
  while (i < blocks.length) {
    if (isSpecialistTalkBlock(blocks[i])) {
      const { grouped, nextIndex } = groupWhile(
        blocks,
        i,
        isSpecialistTalkBlock,
      );
      segments.push({ kind: "specialist-talk", blocks: grouped });
      i = nextIndex;
      continue;
    }
    if (isNextStepCommandBlock(blocks[i])) {
      const { grouped, nextIndex } = groupWhile(
        blocks,
        i,
        isNextStepCommandBlock,
      );
      segments.push({ kind: "next-steps", blocks: grouped });
      i = nextIndex;
      continue;
    }
    segments.push({ kind: "single", block: blocks[i] });
    i += 1;
  }
  return segments;
}
