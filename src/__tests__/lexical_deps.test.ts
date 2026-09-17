// @vitest-environment node

import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * `lexical-beautiful-mentions` importa `@lexical/utils` (peer), mas o
 * `package.json` deste fork não o declarava — e o build do renderer quebrava com
 * "Could not resolve @lexical/utils", derrubando o start do app.
 *
 * A declaração já foi perdida uma vez numa reconciliação de dependências, então
 * aqui ela fica amarrada ao pacote que a exige: se alguém remover o trio do
 * Lexical sem remover o `lexical-beautiful-mentions` junto, o teste falha em vez
 * de o app quebrar na cara do usuário.
 */
describe("dependências do Lexical", () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };

  it("declara @lexical/utils junto com lexical-beautiful-mentions", () => {
    expect(declared["lexical-beautiful-mentions"]).toBeDefined();
    expect(declared["@lexical/utils"]).toBeDefined();
  });

  it("mantém o trio do Lexical na mesma linha de versão", () => {
    // `@lexical/react` e `@lexical/utils` são publicados no mesmo monorepo:
    // versões divergentes entre eles quebram em runtime, não só na resolução.
    const minors = ["lexical", "@lexical/react", "@lexical/utils"].map((name) =>
      (declared[name] ?? "")
        .replace(/^\D*/, "")
        .split(".")
        .slice(0, 2)
        .join("."),
    );

    expect(minors.every((minor) => minor.length > 0)).toBe(true);
    expect(new Set(minors).size).toBe(1);
  });

  it("mantém @lexical/utils no lockfile, que é o que o npm ci usa", () => {
    const lock = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package-lock.json"), "utf8"),
    ) as { packages?: Record<string, unknown> };

    // Sem a entrada de topo, o bundler não resolve o peer do
    // lexical-beautiful-mentions mesmo com a dependência declarada.
    expect(lock.packages?.["node_modules/@lexical/utils"]).toBeDefined();
  });
});
