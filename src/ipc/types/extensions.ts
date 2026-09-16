import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";
import { ExtensionsListResultSchema } from "../../shared/extensions";

/**
 * Extensões declarativas descobertas no disco (REQ-01/REQ-02).
 *
 * `appId` é opcional: sem ele, a listagem traz apenas o escopo do usuário
 * (`<userData>/extensions`); com ele, soma o escopo do projeto (`<app>/.samba`).
 */
export const extensionContracts = {
  list: defineContract({
    channel: "extensions:list",
    input: z.object({ appId: z.number().int().positive().optional() }),
    output: ExtensionsListResultSchema,
  }),
};

export const extensionClient = createClient(extensionContracts);
