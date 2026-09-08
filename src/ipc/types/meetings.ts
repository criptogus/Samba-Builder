import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";
import { MAX_BRIEFING_TEXT_CHARS } from "../../shared/meeting_briefing";
const request = z.object({ requestId: z.string().uuid() });
export const meetingsContracts = {
  importAudio: defineContract({
    channel: "meetings:import-audio",
    input: request,
    output: z
      .object({
        filename: z.string(),
        text: z.string().max(MAX_BRIEFING_TEXT_CHARS),
      })
      .nullable(),
  }),
  cancelAudio: defineContract({
    channel: "meetings:cancel-audio",
    input: request,
    output: z.void(),
  }),
};
export const meetingsClient = createClient(meetingsContracts);
