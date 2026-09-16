#!/usr/bin/env node
// Gera docs/tool-catalog.md a partir do código das tools do agente local (REQ-23).
//
// Por que existe: a lista de tools vive em três lugares que podem divergir —
// `tool_definitions.ts` (o que o modelo recebe), `docs/agent_architecture.md`
// (a prosa) e `estimateAgentToolTokens` (a estimativa de contexto). Um catálogo
// gerado a partir da fonte elimina a divergência manual.
//
// A extração é ESTÁTICA (a lista completa das tools em runtime quebraria no
// `better-sqlite3` e em módulos nativos). O script falha alto se um identificador
// de `TOOL_DEFINITIONS` não for encontrado num arquivo de tool, para que a
// divergência apareça no lugar de virar uma linha errada no catálogo.
//
// Uso:
//   node scripts/gen-tool-catalog.mjs          # escreve docs/tool-catalog.md
//   node scripts/gen-tool-catalog.mjs --check   # falha se o arquivo divergir

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const toolsDirectory = path.join(
  repoRoot,
  "src/pro/main/ipc/handlers/local_agent/tools",
);
const definitionsPath = path.join(
  repoRoot,
  "src/pro/main/ipc/handlers/local_agent/tool_definitions.ts",
);
const outputPath = path.join(repoRoot, "docs/tool-catalog.md");

function readStringLiteral(source, startIndex) {
  const quote = source[startIndex];
  let index = startIndex + 1;
  let value = "";
  while (index < source.length) {
    const character = source[index];
    if (character === "\\") {
      value += source[index + 1];
      index += 2;
      continue;
    }
    if (character === quote) return { value, end: index };
    value += character;
    index += 1;
  }
  return null;
}

/** Lê o literal de string de um campo do objeto da tool (aceita `"`, `'` e `` ` ``). */
function extractField(source, field, fromIndex = 0) {
  const keyIndex = source.indexOf(`${field}:`, fromIndex);
  if (keyIndex === -1) return null;
  let index = keyIndex + field.length + 1;
  while (index < source.length && /\s/.test(source[index])) index += 1;
  const quote = source[index];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;
  return readStringLiteral(source, index);
}

/** Identificadores na ordem em que o agente recebe as tools. */
function parseRegisteredToolIdentifiers(source) {
  const listStart = source.indexOf("TOOL_DEFINITIONS");
  if (listStart === -1) {
    throw new Error("TOOL_DEFINITIONS não encontrado em tool_definitions.ts");
  }
  const equalsIndex = source.indexOf("=", listStart);
  const listEnd = source.indexOf("];", equalsIndex);
  if (equalsIndex === -1 || listEnd === -1) {
    throw new Error("Não foi possível delimitar o array TOOL_DEFINITIONS");
  }
  return (
    source
      .slice(equalsIndex, listEnd)
      // Comentários dentro do array (ex.: "// Plan mode tools") não são tools.
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/[^\n]*/g, " ")
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter((token) => /^[A-Za-z][A-Za-z0-9]*$/.test(token) && token !== "as")
  );
}

function firstSentence(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const stop = normalized.search(/\.(\s|$)/);
  const sentence = stop === -1 ? normalized : normalized.slice(0, stop + 1);
  return sentence.length > 200 ? `${sentence.slice(0, 197)}...` : sentence;
}

async function main() {
  const definitionsSource = await readFile(definitionsPath, "utf8");
  const identifiers = parseRegisteredToolIdentifiers(definitionsSource);
  const files = (await readdir(toolsDirectory)).filter(
    (name) => name.endsWith(".ts") && !/\.(spec|test)\.ts$/.test(name),
  );

  const sources = new Map();
  for (const name of files) {
    sources.set(name, await readFile(path.join(toolsDirectory, name), "utf8"));
  }

  const rows = [];
  const missing = [];
  for (const identifier of identifiers) {
    let fileName = null;
    let source = null;
    for (const [name, content] of sources) {
      if (content.includes(`export const ${identifier}`)) {
        fileName = name;
        source = content;
        break;
      }
    }
    if (!source) {
      missing.push(identifier);
      continue;
    }

    const exportIndex = source.indexOf(`export const ${identifier}`);
    const scoped = source.slice(exportIndex);
    const name = extractField(scoped, "name");
    if (!name) {
      missing.push(identifier);
      continue;
    }
    const description = extractField(scoped, "description");
    const consent = extractField(scoped, "defaultConsent");

    rows.push({
      name: name.value,
      file: `src/pro/main/ipc/handlers/local_agent/tools/${fileName}`,
      consent: consent ? `\`${consent.value}\`` : "—",
      dynamic: /getDescription/.test(scoped) ? "sim" : "—",
      summary: description ? firstSentence(description.value) : "—",
    });
  }

  if (missing.length > 0) {
    throw new Error(
      `Estas tools estão em TOOL_DEFINITIONS mas não foram encontradas em tools/*.ts: ${missing.join(", ")}`,
    );
  }

  rows.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const lines = [
    "# Catálogo de tools do agente local",
    "",
    "<!-- Gerado por scripts/gen-tool-catalog.mjs — não edite à mão. -->",
    "",
    "Regenerar: `npm run gen:tool-catalog`. Conferir sem escrever (CI): `npm run gen:tool-catalog -- --check`.",
    "",
    `Fonte: \`src/pro/main/ipc/handlers/local_agent/tool_definitions.ts\` (ordem de exposição) e os`,
    `arquivos em \`src/pro/main/ipc/handlers/local_agent/tools/\`. Extração estática.`,
    "",
    `Total: **${rows.length} tools**.`,
    "",
    "| Tool | Consentimento padrão | Descrição dinâmica | Arquivo | Resumo |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| \`${row.name}\` | ${row.consent} | ${row.dynamic} | \`${row.file}\` | ${row.summary.replace(/\|/g, "\\|")} |`,
    ),
    "",
  ];
  const generated = lines.join("\n");

  if (process.argv.includes("--check")) {
    let current = "";
    try {
      current = await readFile(outputPath, "utf8");
    } catch {
      console.error(
        "docs/tool-catalog.md não existe. Rode `npm run gen:tool-catalog`.",
      );
      process.exit(1);
    }
    if (current !== generated) {
      console.error(
        "docs/tool-catalog.md está desatualizado. Rode `npm run gen:tool-catalog` e faça commit do resultado.",
      );
      process.exit(1);
    }
    console.log(`docs/tool-catalog.md está atualizado (${rows.length} tools).`);
    return;
  }

  await writeFile(outputPath, generated, "utf8");
  console.log(`docs/tool-catalog.md gerado com ${rows.length} tools.`);
}

await main();
