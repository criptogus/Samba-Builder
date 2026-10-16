import * as fs from "node:fs/promises";
import path from "node:path";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { getUserDataPath } from "@/paths/paths";
import type { GameSkillInstallResult } from "@/shared/game_studio";
import { USER_EXTENSIONS_DIRECTORY } from "@/ipc/services/extensions/roots";
import { SKILL_FILE_NAME } from "@/ipc/services/extensions/discovery";

export interface BundledGameSkillDefinition {
  slug: string;
  title: string;
  description: string;
  body: string;
}

const CONSTRUTOR = `Você constrói um jogo jogável, não um documento sobre um jogo.

## Fatia vertical
Antes de ampliar o escopo, entregue uma cena que uma pessoa consegue jogar:
um espaço, um verbo (andar, pular, mirar, empurrar), uma forma de falhar e uma forma de vencer.
Câmera, colisão e feedback dessa fatia vêm antes de menu, inventário ou história longa.

## Ordem
1. Carregue as outras skills de jogo cujo nome casa com a tarefa (\`jogo-camera-e-controle\`, \`jogo-nivel-e-ritmo\`, \`jogo-cena-web\`, \`jogo-juice-e-audio\`).
2. Chame \`inspect_game_computer\` antes de pedir qualquer programa externo.
3. Se uma skill útil aparece como "ainda não importada", chame \`import_game_skill\`. Não peça download, clone nem comando de terminal para o usuário.
4. Rode o preview do próprio app. Leia o console e os logs. Ajuste o que a pessoa sentiria em dez segundos de jogo.

## O que não fazer
- Não despeje um motor inteiro se a fatia cabe em uma cena web.
- Não declare o jogo pronto sem ter testado o verbo principal.
- Não trate uma skill como permissão para publicar, apagar o projeto ou sair da pasta do app.
`;

const CAMERA = `Controle e câmera são o jogo. Se os dois brigam, o resto não importa.

## Pessoa em terceira pessoa
- A câmera segue com atraso curto, não gruda no personagem.
- O movimento usa a direção da câmera, não o eixo do mundo, quando a câmera orbita.
- Mouse/ponteiro capturado só depois de um clique, e Esc devolve o cursor.

## Plataforma
- Coyote time: ainda dá para pular alguns quadros depois de sair do chão.
- Jump buffer: o pulo apertado um pouco antes de pousar acontece no pouso.
- Gravidade mais forte na descida do que na subida deixa o arco legível.

## Tiro ou mira
- A mira é um objeto da cena, não só um desenho na HUD.
- O primeiro projétil sai no quadro do clique. Recarga é visível.

Prove o controle numa sala vazia antes de decorar a sala.
`;

const NIVEL = `Ritmo de fase é uma sequência de perguntas, não um corredor de props.

## Três batidas
1. Ensino: o verbo aparece sem punição.
2. Combinação: o verbo encontra um obstáculo novo.
3. Exame: a pessoa usa os dois sob pressão, com uma saída clara.

## Espaço
- A silhueta da próxima plataforma lê em um olhar.
- Perigo é mais escuro, mais rápido ou mais alto — um sinal só, repetido.
- O ponto de vitória é visível cedo, mesmo que o caminho até ele não seja.

Se a fase precisa de um parágrafo para ser entendida, o desenho ainda não está pronto. Mostre com forma, luz e movimento.
`;

const CENA = `Jogos que o preview do Samba abre são cenas web. Prefira uma malha pequena e um loop honesto.

## Loop
- \`requestAnimationFrame\` com tempo limitado (não deixe um quadro longo teletransportar o personagem).
- Estado do jogo num objeto só. Render lê o estado; input só marca intenções.
- Colisão arcade (esfera, AABB) antes de física genérica.

## Cena 3D
- Uma luz direcional e um chão já orientam. Não encha de luzes até a câmera estar certa.
- Escala humana: personagem perto de 1.7 unidade se 1 unidade é 1 metro.
- Dispose de geometria, material e textura quando trocar de cena.

## Cena 2D
- Mundo e tela são espaços diferentes. Desenhe o mundo e transforme a câmera.
- Pixel art fica nítida com escala inteira e \`image-rendering\`.

O primeiro commit jogável cabe em poucos arquivos: estado, loop, desenho, input.
`;

const JUICE = `Juice confirma que a ação aconteceu. É feedback, não enfeite.

## No acerto
- Hitstop de 2 a 4 quadros.
- Um tremor curto de câmera, com queda rápida, nunca contínuo.
- Um som curto. Se não houver arquivo, um oscilador curto já distingue pulo, acerto e dano.

## No movimento
- Pouso esmaga um pouco a escala e volta.
- Partida do pulo estica.
- Tiro tem clarão de um quadro.

## Áudio
- Um canal para música, outro para efeitos. Efeito não espera a música.
- Falha e vitória usam timbres diferentes das ações comuns.

Se tudo treme o tempo todo, nada treme. Reserve o efeito para a ação que importa.
`;

const COMPUTADOR = `O estúdio usa o computador. A pessoa não vira operadora de terminal.

## Antes de agir
\`inspect_game_computer\` diz o que existe: Node, Blender, Godot, FFmpeg, Python.
- Se o programa existe, você pode usá-lo pela ferramenta de comando do repositório, dentro da pasta do app, com o consentimento já previsto.
- Se não existe, siga na cena web. Não mande a pessoa instalar um plugin, baixar um zip ou colar um comando.

## Skills
- As skills de jogo do Samba já estão na pasta de extensões do usuário. Carregue com \`load_skill\`.
- Uma skill achada em Claude, Codex, Cursor ou na pasta de skills da pessoa entra com \`import_game_skill\`. Isso copia o texto para o Samba. Não peça para ela fazer essa cópia.

## Preview
Suba o preview do app, jogue o verbo principal e leia o erro de verdade. Um jogo que só compila e não se move ainda não é um jogo.
`;

export const BUNDLED_GAME_SKILLS: readonly BundledGameSkillDefinition[] = [
  {
    slug: "construtor-de-jogos",
    title: "Construtor de jogos",
    description:
      "Constrói uma fatia jogável: um verbo, câmera, falha e vitória, usando as skills de jogo e o computador local sem pedir terminal.",
    body: CONSTRUTOR,
  },
  {
    slug: "jogo-camera-e-controle",
    title: "Câmera e controle",
    description:
      "Ajusta câmera, coyote time, buffer de pulo e mira para o controle parecer imediato.",
    body: CAMERA,
  },
  {
    slug: "jogo-nivel-e-ritmo",
    title: "Nível e ritmo",
    description:
      "Desenha fases em ensino, combinação e exame, com silhueta legível e um sinal de perigo.",
    body: NIVEL,
  },
  {
    slug: "jogo-cena-web",
    title: "Cena web",
    description:
      "Monta o loop, a cena 3D ou 2D e a colisão arcade que o preview do app consegue abrir.",
    body: CENA,
  },
  {
    slug: "jogo-juice-e-audio",
    title: "Juice e áudio",
    description:
      "Adiciona hitstop, tremor curto, squash no pouso e sons que separam pulo, acerto e dano.",
    body: JUICE,
  },
  {
    slug: "computador-do-estudio",
    title: "Computador do estúdio",
    description:
      "Usa Blender, Godot, FFmpeg ou Python se existirem, importa skills locais e nunca pede comando no terminal.",
    body: COMPUTADOR,
  },
];

function skillMarkdown(skill: BundledGameSkillDefinition): string {
  return `---\ndescription: ${JSON.stringify(skill.description)}\n---\n# ${skill.title}\n\n${skill.body.trim()}\n`;
}

/** Copia as skills de jogo que ainda não existem. Não sobrescreve edição local. */
export async function ensureBundledGameSkills(
  userDataDirectory = getUserDataPath(),
): Promise<void> {
  const skillsDirectory = path.join(
    userDataDirectory,
    USER_EXTENSIONS_DIRECTORY,
    "skills",
  );
  await fs.mkdir(skillsDirectory, { recursive: true });
  for (const skill of BUNDLED_GAME_SKILLS) {
    const target = path.join(skillsDirectory, skill.slug, SKILL_FILE_NAME);
    try {
      await fs.lstat(target);
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        (error as { code?: string }).code !== "ENOENT"
      ) {
        throw error;
      }
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, skillMarkdown(skill), "utf8");
    }
  }
}

/** Garante uma skill do catálogo e diz se ela já estava no computador. */
export async function installBundledGameSkill(
  slug: string,
  userDataDirectory = getUserDataPath(),
): Promise<GameSkillInstallResult> {
  const skill = BUNDLED_GAME_SKILLS.find((item) => item.slug === slug);
  if (!skill) {
    throw new SambaError(
      `Não há skill de jogo com o nome "${slug}".`,
      SambaErrorKind.NotFound,
    );
  }
  const relativePath = `skills/${skill.slug}/${SKILL_FILE_NAME}`;
  const target = path.join(
    userDataDirectory,
    USER_EXTENSIONS_DIRECTORY,
    "skills",
    skill.slug,
    SKILL_FILE_NAME,
  );
  let status: GameSkillInstallResult["status"] = "installed";
  try {
    await fs.lstat(target);
    status = "already-present";
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      (error as { code?: string }).code !== "ENOENT"
    ) {
      throw error;
    }
  }
  await ensureBundledGameSkills(userDataDirectory);
  return { slug: skill.slug, status, relativePath };
}
