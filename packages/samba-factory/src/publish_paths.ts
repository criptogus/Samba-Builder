/**
 * Inventário dos caminhos que podem publicar um app de cliente.
 * `gated` consulta o Security Gate e falha fechado.
 * `residual` não dá para interceptar sem tomar o shell da pessoa; a política
 * proíbe usar esse caminho para publicar projeto da Fábrica.
 */
export const PUBLISH_PATHS = [
  {
    id: "git-push",
    surface: "Git push nativo, do agente e automático",
    disposition: "gated",
  },
  {
    id: "vercel-create",
    surface: "Criar projeto Vercel (primeiro deploy)",
    disposition: "gated",
  },
  {
    id: "vercel-deploy",
    surface: "Deploy Vercel, preview e production",
    disposition: "gated",
  },
  {
    id: "coolify-deploy",
    surface: "Deploy Coolify",
    disposition: "gated",
  },
  {
    id: "aws-deploy",
    surface: "Deploy AWS",
    disposition: "gated",
  },
  {
    id: "supabase-function",
    surface: "Publicar função Supabase pelo agente",
    disposition: "gated",
  },
  {
    id: "repo-command",
    surface:
      "Comando do agente classificado como publish (git push, vercel, npm publish)",
    disposition: "gated",
  },
  {
    id: "mcp-publish",
    surface: "Ferramenta MCP cujo nome publica (deploy/publish)",
    disposition: "gated",
  },
  {
    id: "pty-terminal",
    surface: "Terminal interativo do aplicativo",
    disposition: "residual",
  },
] as const;

export type PublishDisposition = (typeof PUBLISH_PATHS)[number]["disposition"];

/** Nome de ferramenta MCP que publica fora da máquina. Leitura não entra. */
export function isExternalPublishTool(name: string): boolean {
  const normalized = name.toLowerCase().replace(/[_-]+/g, " ");
  if (/\b(list|get|read|status|search|describe|preview)\b/.test(normalized)) {
    return false;
  }
  return /\b(deploy|publish|push)\b/.test(normalized);
}
