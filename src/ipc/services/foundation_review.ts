import { foundationTemplates } from "./project_foundation";
import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { DeliveryPlan } from "@/delivery/model";

export const reviewedDocuments = [
  "PRD.md",
  "ARCHITECTURE.md",
  "TECH_STACK.md",
  "DESIGN_SYSTEM.md",
  "TESTING.md",
  "OPERATIONS.md",
] as const;
/** Read only fixed paths, bounded files; never follow documentation symlinks. */
export async function inspectFoundation(root: string) {
  const directory = path.join(root, "project-docs");
  const stat = await fs.lstat(directory).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!stat) return { required: false, documents: [] };
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error("Base do projeto inválida: não use links simbólicos.");
  const documents = [];
  for (const file of reviewedDocuments) {
    const target = path.join(directory, file);
    const info = await fs.lstat(target).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (
      !info ||
      !info.isFile() ||
      info.isSymbolicLink() ||
      info.size > 256000
    ) {
      documents.push({
        file,
        digest: "",
        issue: "Documento ausente, inválido ou maior que 256 KB.",
      });
      continue;
    }
    const handle = await fs.open(
      target,
      constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
    );
    let content: string;
    try {
      const opened = await handle.stat();
      if (!opened.isFile() || opened.size > 256000)
        throw new Error("Documento inválido ou grande demais.");
      const buffer = Buffer.alloc(256001);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (bytesRead > 256000) throw new Error("Documento grande demais.");
      content = buffer.subarray(0, bytesRead).toString("utf8");
    } finally {
      await handle.close();
    }
    documents.push({
      file,
      digest: createHash("sha256").update(content).digest("hex"),
      issue: !content.trim()
        ? "Documento vazio."
        : content.trim() === foundationTemplates[file]?.trim()
          ? "Complete o rascunho inicial antes da revisão."
          : "",
    });
  }
  return { required: true, documents };
}
export async function assertFoundationReviewed(
  root: string,
  plan?: DeliveryPlan,
) {
  const foundation = await inspectFoundation(root);
  if (!foundation.required && !plan?.foundationRequired) return;
  if (!foundation.required)
    throw new Error(
      "Restaure a base project-docs antes de aprovar ou publicar este projeto.",
    );
  if (!plan)
    throw new Error(
      "Crie e aprove o plano de entrega antes de publicar este projeto em produção.",
    );
  const pending = foundation.documents.filter(
    (document) =>
      document.issue ||
      !plan.foundationReviews?.some(
        (review) =>
          review.file === document.file && review.digest === document.digest,
      ),
  );
  if (pending.length)
    throw new Error(
      `Revise a documentação atual na aba Revisão: ${pending.map((d) => d.file).join(", ")}.`,
    );
}
