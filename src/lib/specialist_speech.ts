import type { Block } from "@/lib/streamingMessageParser";
import { getSpecialistAgent } from "@/lib/specialist_agents";

export type SpecialistSayAbout = "done" | "next";

export type SpecialistSay = {
  specialist: string;
  about: SpecialistSayAbout;
  body: string;
};

export type SpecialistInvite = {
  from?: string;
  specialist: string;
  why?: string;
  prompt: string;
};

export function specialistSayFromBlock(block: Block): SpecialistSay | null {
  if (block.kind !== "custom-tag" || block.tag !== "samba-say") return null;
  const specialist = block.attributes.specialist?.trim();
  const body = block.content.trim();
  if (!specialist || !getSpecialistAgent(specialist) || !body) return null;
  const about: SpecialistSayAbout =
    block.attributes.about === "next" ? "next" : "done";
  return { specialist, about, body };
}

export function specialistInviteFromBlock(
  block: Block,
): SpecialistInvite | null {
  if (block.kind !== "custom-tag" || block.tag !== "samba-invite") {
    return null;
  }
  const specialist = block.attributes.specialist?.trim();
  const prompt = block.attributes.prompt?.trim();
  if (!specialist || !getSpecialistAgent(specialist) || !prompt) return null;
  const from = block.attributes.from?.trim();
  return {
    specialist,
    prompt,
    ...(from && getSpecialistAgent(from) ? { from } : {}),
    ...(block.attributes.why?.trim()
      ? { why: block.attributes.why.trim() }
      : {}),
  };
}

export function isSpecialistTalkBlock(block: Block): boolean {
  return (
    specialistSayFromBlock(block) !== null ||
    specialistInviteFromBlock(block) !== null
  );
}
