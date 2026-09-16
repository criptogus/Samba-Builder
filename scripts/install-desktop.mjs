#!/usr/bin/env node
// Instala NESTA máquina o pacote local gerado por `npm run desktop:build`
// (`out/desktop`) — copiando o app para a pasta de aplicações do sistema.
//
// Por que existe: `npm run desktop` roda o pacote de dentro do repositório, com
// o perfil de dados do repo. Instalar copia o app para a pasta de aplicações,
// que é como a pessoa realmente usa o produto no dia a dia. Este caminho **não**
// substitui o release assinado (`npm run make`): o pacote local não é assinado
// nem notarizado, então o macOS pode pedir confirmação no primeiro lançamento.
//
// Uso:
//   npm run desktop:build && npm run desktop:install
//   npm run desktop:install -- --destination ~/Applications

import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { desktopPackageDir } from "./start-desktop.mjs";

/** Bundle .app (macOS) ou .exe (Windows) dentro do pacote local. */
export function desktopBundledAppPath(root, name, platform, arch) {
  const base = desktopPackageDir(root, name, platform, arch);
  return platform === "darwin"
    ? path.join(base, `${name}.app`)
    : path.join(base, `${name}.exe`);
}

/**
 * Decide o que copiar para onde. Puro: não toca no disco além de checar.
 *
 * @returns {{ source: string, destination: string, replacingExisting: boolean, samePath: boolean }}
 */
export function installPlan({ root, name, platform, arch, destinationRoot }) {
  const source = desktopBundledAppPath(root, name, platform, arch);
  const bundledName = platform === "darwin" ? `${name}.app` : `${name}.exe`;
  const destination = path.join(destinationRoot, bundledName);
  return {
    source,
    destination,
    replacingExisting: existsSync(destination),
    samePath: path.resolve(source) === path.resolve(destination),
  };
}

/**
 * Falha cedo, com o próximo passo concreto, em vez de copiar coisa errada.
 *
 * @param {{ source: string, destination: string, samePath: boolean }} plan
 */
export function assertInstallable(plan) {
  if (!existsSync(plan.source)) {
    throw new Error(
      `Pacote não encontrado em ${plan.source}. Gere primeiro com \`npm run desktop:build\`.`,
    );
  }
  if (plan.samePath) {
    throw new Error(
      "Origem e destino são o mesmo caminho; escolha outra pasta de destino.",
    );
  }
}

/** Nome do app a partir do package.json (fonte única do nome do produto). */
export function productNameFromManifest(root) {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const name = pkg.productName || pkg.name;
  if (typeof name !== "string" || !name) {
    throw new Error("package.json sem productName/name.");
  }
  return name;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const destinationFlagIndex = process.argv.indexOf("--destination");
  const destinationRoot =
    destinationFlagIndex > -1 && process.argv[destinationFlagIndex + 1]
      ? path.resolve(process.argv[destinationFlagIndex + 1])
      : path.join(os.homedir(), "Applications");

  try {
    const name = productNameFromManifest(root);
    const plan = installPlan({
      root,
      name,
      platform: process.platform,
      arch: process.arch,
      destinationRoot,
    });
    assertInstallable(plan);

    if (plan.replacingExisting) {
      rmSync(plan.destination, { recursive: true, force: true });
    }
    cpSync(plan.source, plan.destination, { recursive: true });
    console.log(`Instalado em ${plan.destination}`);
    console.log(
      "Se o app estava aberto, feche e abra de novo pela pasta de aplicações.",
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
