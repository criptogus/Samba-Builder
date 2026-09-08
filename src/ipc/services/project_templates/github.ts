import * as fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  TEAM_TEMPLATE_REPO,
  TEAM_TEMPLATE_DIRECTORY,
  TeamTemplateIndexSchema,
  type TemplateDraft,
  type TeamTemplateEntry,
} from "@/shared/project_templates";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { digest, safeTemplatePath } from "./files";
const Sha = z.string().regex(/^[a-f0-9]{40}$/);
const ObjectResult = z.object({ sha: Sha });

export class TeamTemplatesGithub {
  private readonly signal = AbortSignal.timeout(180_000);
  constructor(
    private readonly token?: string,
    private readonly request: typeof fetch = fetch,
  ) {}
  private async api(
    route: string,
    method = "GET",
    body?: unknown,
    allowMissing = false,
  ): Promise<unknown> {
    const response = await this.request(
      `https://api.github.com/repos/${TEAM_TEMPLATE_REPO}${route}`,
      {
        method,
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: this.signal,
        redirect: "error",
      },
    );
    if (response.status === 404 && allowMissing) {
      await response.body?.cancel();
      return null;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new SambaError(
        `GitHub HTTP ${response.status}. ${response.status === 401 || response.status === 403 ? "Verifique a conexão GitHub e a permissão de escrita no repositório oficial." : response.status === 409 || response.status === 422 ? "O repositório mudou ou a branch exige revisão. Atualize o catálogo e tente novamente; nenhuma alteração será forçada." : "Não foi possível acessar os templates da equipe."}`,
        response.status === 401 || response.status === 403
          ? SambaErrorKind.Auth
          : SambaErrorKind.External,
      );
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Resposta vazia do GitHub.");
    const decoder = new TextDecoder();
    let text = "",
      bytes = 0;
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 30_000_000)
          throw new Error("Resposta do GitHub excede o limite.");
        text += decoder.decode(part.value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    return JSON.parse(text);
  }
  async head() {
    const repo = z
      .object({ default_branch: z.string().min(1), private: z.boolean() })
      .parse(await this.api(""));
    const ref = z
      .object({ object: ObjectResult })
      .parse(
        await this.api(
          `/git/ref/heads/${encodeURIComponent(repo.default_branch)}`,
        ),
      );
    return {
      branch: repo.default_branch,
      private: repo.private,
      sha: ref.object.sha,
    };
  }
  async index(ref: string) {
    const response = await this.api(
      `/contents/${TEAM_TEMPLATE_DIRECTORY}/index.json?ref=${encodeURIComponent(ref)}`,
      "GET",
      undefined,
      true,
    );
    if (response === null) return { version: 1 as const, templates: [] };
    const file = z
      .object({
        encoding: z.literal("base64"),
        content: z.string().max(2_000_000),
      })
      .parse(response);
    return TeamTemplateIndexSchema.parse(
      JSON.parse(Buffer.from(file.content, "base64").toString("utf8")),
    );
  }
  async publish(
    draft: TemplateDraft,
    source: string,
  ): Promise<TeamTemplateEntry> {
    if (!this.token)
      throw new SambaError(
        "Conecte sua conta GitHub na integração GitHub do projeto antes de publicar.",
        SambaErrorKind.Auth,
      );
    const head = await this.head();
    const index = await this.index(head.sha);
    const existing = index.templates.find((entry) => entry.id === draft.id);
    if (existing) return existing; // Retry after an uncertain response is idempotent.
    if (index.templates.length >= 500)
      throw new Error("O catálogo atingiu o limite de 500 templates.");
    const tree: {
      path: string;
      mode: "100644" | "100755";
      type: "blob";
      sha: string;
    }[] = [];
    for (const file of draft.files) {
      if (!safeTemplatePath(file.path))
        throw new Error("Caminho inválido no template.");
      const filename = path.join(source, file.path);
      const stat = await fs.lstat(filename);
      if (!stat.isFile() || stat.size !== file.size)
        throw new Error("Template alterado após a revisão. Prepare novamente.");
      const content = await fs.readFile(filename);
      if (digest(content) !== file.digest)
        throw new Error("Template alterado após a revisão. Prepare novamente.");
      const blob = ObjectResult.parse(
        await this.api("/git/blobs", "POST", {
          content: content.toString("base64"),
          encoding: "base64",
        }),
      );
      tree.push({
        path: file.path,
        mode: file.executable ? "100755" : "100644",
        type: "blob",
        sha: blob.sha,
      });
    }
    const filesTree = ObjectResult.parse(
      await this.api("/git/trees", "POST", { tree }),
    );
    const entry: TeamTemplateEntry = {
      id: draft.id,
      title: draft.title,
      description: draft.description,
      createdAt: draft.createdAt,
      treeSha: filesTree.sha,
    };
    const parent = z
      .object({ tree: ObjectResult })
      .parse(await this.api(`/git/commits/${head.sha}`));
    const root = ObjectResult.parse(
      await this.api("/git/trees", "POST", {
        base_tree: parent.tree.sha,
        tree: [
          {
            path: `${TEAM_TEMPLATE_DIRECTORY}/${draft.id}/files`,
            mode: "040000",
            type: "tree",
            sha: filesTree.sha,
          },
          {
            path: `${TEAM_TEMPLATE_DIRECTORY}/${draft.id}/template.json`,
            mode: "100644",
            type: "blob",
            content: JSON.stringify(entry, null, 2) + "\n",
          },
          {
            path: `${TEAM_TEMPLATE_DIRECTORY}/index.json`,
            mode: "100644",
            type: "blob",
            content:
              JSON.stringify(
                { version: 1, templates: [...index.templates, entry] },
                null,
                2,
              ) + "\n",
          },
        ],
      }),
    );
    const commit = ObjectResult.parse(
      await this.api("/git/commits", "POST", {
        message: `template: ${draft.title}`,
        tree: root.sha,
        parents: [head.sha],
      }),
    );
    await this.api(
      `/git/refs/heads/${encodeURIComponent(head.branch)}`,
      "PATCH",
      { sha: commit.sha, force: false },
    );
    return entry;
  }
  async download(entry: TeamTemplateEntry, destination: string) {
    const result = z
      .object({
        truncated: z.boolean(),
        tree: z
          .array(
            z.object({
              path: z.string(),
              mode: z.string(),
              type: z.string(),
              sha: Sha,
              size: z.number().optional(),
            }),
          )
          .max(5000),
      })
      .parse(await this.api(`/git/trees/${entry.treeSha}?recursive=1`));
    if (result.truncated) throw new Error("Template incompleto no GitHub.");
    const files = result.tree.filter((item) => item.type !== "tree");
    if (
      !files.length ||
      files.length > 1000 ||
      files.reduce((sum, item) => sum + (item.size ?? 100_000_001), 0) >
        100_000_000
    )
      throw new Error("Template excede o limite de arquivos/tamanho.");
    // Validate the complete inventory before writing any remote content.
    const seen = new Set<string>();
    for (const file of result.tree) {
      if (
        !safeTemplatePath(file.path) ||
        (file.type !== "tree" &&
          (file.type !== "blob" ||
            !["100644", "100755"].includes(file.mode) ||
            file.size === undefined ||
            file.size < 0 ||
            file.size > 20_000_000))
      )
        throw new Error(`Arquivo incompatível no template: ${file.path}`);
      const key = file.path.normalize("NFC").toLowerCase();
      if (seen.has(key))
        throw new Error("Template contém nomes duplicados em Mac/Windows.");
      seen.add(key);
    }
    for (const file of files) {
      const blob = z
        .object({ content: z.string(), encoding: z.literal("base64") })
        .parse(await this.api(`/git/blobs/${file.sha}`));
      const content = Buffer.from(blob.content, "base64");
      const sha = createHash("sha1")
        .update(`blob ${content.length}\0`)
        .update(content)
        .digest("hex");
      if (content.length !== file.size || sha !== file.sha)
        throw new Error(
          "Conteúdo do template não corresponde à versão publicada.",
        );
      const target = path.join(destination, file.path);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, {
        flag: "wx",
        mode: file.mode === "100755" ? 0o755 : 0o644,
      });
    }
  }
}
