import { z } from "zod";
import {
  ToolDefinition,
  AgentContext,
  canUseNeonTools,
  escapeXmlContent,
} from "./types";
import { getNeonProjectInfo } from "../../../../../../neon_admin/neon_context";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";

// At least one property is needed because Vertex AI rejects empty parameter schemas.
const getNeonProjectInfoSchema = z.object({
  _reserved: z
    .boolean()
    .optional()
    .describe(
      "Reserved placeholder because some model providers reject empty parameter schemas. Leave this unset.",
    ),
});

export const getNeonProjectInfoTool: ToolDefinition<
  z.infer<typeof getNeonProjectInfoSchema>
> = {
  name: "get_neon_project_info",
  description:
    "Get Neon project overview: project ID, branches, and table names. Use this to discover what tables exist before fetching detailed schemas.",
  inputSchema: getNeonProjectInfoSchema,
  defaultConsent: "always",
  isEnabled: canUseNeonTools,

  getConsentPreview: () => "Get Neon project info",

  execute: async (_args, ctx: AgentContext) => {
    if (!canUseNeonTools(ctx)) {
      throw new SambaError(
        "Neon is not connected to this app",
        SambaErrorKind.Precondition,
      );
    }

    ctx.onXmlStream("<samba-neon-project-info></samba-neon-project-info>");

    const info = await getNeonProjectInfo({
      projectId: ctx.neonProjectId,
      branchId: ctx.neonActiveBranchId,
    });

    ctx.onXmlComplete(
      `<samba-neon-project-info>\n${escapeXmlContent(info)}\n</samba-neon-project-info>`,
    );

    return info;
  },
};
