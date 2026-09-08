export const UNKNOWN = "Ainda não sei — decisão pendente";
export const CAPABILITIES = [
  {
    id: "public",
    label: "Conteúdo público",
    help: "Páginas, portfólio ou informações sem login.",
  },
  {
    id: "accounts",
    label: "Contas e dados privados",
    help: "Pessoas acessam ou alteram informações próprias.",
  },
  {
    id: "payments",
    label: "Vendas ou pagamentos",
    help: "Compra, assinatura ou cobrança.",
  },
  {
    id: "integrations",
    label: "Integrações ou gravações",
    help: "Dados de reuniões ou de outros serviços.",
  },
] as const;
export type Capability = (typeof CAPABILITIES)[number]["id"];
export type Answers = Record<string, string>;
export interface ProductDraft {
  version: 1;
  answers: Answers;
  capabilities: Capability[];
  capabilitiesAnswered: boolean;
}
export interface ProductQuestion {
  id: string;
  title: string;
  why: string;
  example: string;
}
const CORE: ProductQuestion[] = [
  {
    id: "problem",
    title: "Qual problema vale a pena resolver?",
    why: "Começamos pela dificuldade real, para evitar construir funcionalidades que ninguém precisa.",
    example:
      "Clínicas perdem agendamentos porque confirmam tudo manualmente pelo WhatsApp.",
  },
  {
    id: "audience",
    title: "Quem sente esse problema e como resolve hoje?",
    why: "Um público específico ajuda a escolher o que simplificar. Quem usa pode ser diferente de quem paga.",
    example:
      "Recepcionistas de clínicas pequenas usam uma planilha. Duas entrevistas mostraram horários duplicados.",
  },
  {
    id: "journey",
    title: "O que essa pessoa precisa conseguir fazer, do início ao fim?",
    why: "Desenhamos uma experiência útil completa, em vez de apenas uma lista de telas.",
    example:
      "Paciente escolhe um horário pelo celular, confirma os dados e recebe a confirmação.",
  },
  {
    id: "scope",
    title: "O que é indispensável na primeira versão — e o que pode esperar?",
    why: "Uma entrega menor permite aprender cedo. Escolha um resultado principal e deixe explícito o que ficará de fora.",
    example:
      "Primeiro: agendar e cancelar. Depois: pagamento e programa de fidelidade.",
  },
  {
    id: "capabilities",
    title: "Que tipo de interação o produto precisa ter?",
    why: "Suas escolhas determinam quais perguntas sobre acesso, cobrança e serviços fazem sentido.",
    example:
      "Marque apenas o necessário para a primeira versão. Não é preciso decidir tecnologias.",
  },
  {
    id: "experience",
    title:
      "O que tornará a experiência fácil, inclusive quando algo der errado?",
    why: "Qualidade também é funcionar no celular, com teclado e em situações de erro. Referências visuais ajudam, mas não substituem isso.",
    example:
      "Agendamento em poucos passos no celular. Se o horário acabar, oferecer alternativas sem apagar os dados.",
  },
  {
    id: "success",
    title: "Como saberemos se deu certo — e como testar isso cedo?",
    why: "Uma medida observável e um teste com usuários evitam confundir uma interface bonita com um produto útil.",
    example:
      "Em duas semanas, 5 recepcionistas conseguem agendar sem ajuda. Medir redução de horários duplicados.",
  },
  {
    id: "constraints",
    title:
      "Qual é o prazo, o limite de investimento e quem cuidará do produto?",
    why: "Esses limites orientam uma solução que a equipe consiga entregar e manter. Não precisa saber a arquitetura.",
    example:
      "Piloto em 15 dias, orçamento mensal limitado e um desenvolvedor júnior responsável.",
  },
];
const FOLLOWUPS: Partial<Record<Capability, ProductQuestion>> = {
  accounts: {
    id: "access",
    title: "Quem pode ver ou alterar quais informações?",
    why: "Definir responsabilidades agora evita expor dados e simplifica as permissões.",
    example:
      "Paciente vê só seus agendamentos; recepcionista gerencia a clínica; cada clínica fica isolada.",
  },
  payments: {
    id: "billing",
    title: "Como será a cobrança e o que acontece se ela falhar?",
    why: "Preço, confirmação e reembolso fazem parte da experiência, antes da escolha do provedor de pagamento.",
    example:
      "Pagamento por reserva. Reserva só é confirmada após aprovação; falha permite tentar novamente; definir regra de reembolso.",
  },
  integrations: {
    id: "connections",
    title: "De onde vêm os dados e como agir se o serviço ficar indisponível?",
    why: "Precisamos saber quem revisa os dados, quem pode usá-los e qual alternativa mantém o trabalho funcionando.",
    example:
      "Briefing vem de uma reunião autorizada no Granola. Uma pessoa revisa a transcrição; permitir importação manual e definir quando excluir a gravação.",
  },
};
export function productQuestions(capabilities: Capability[]) {
  return CORE.flatMap((question) =>
    question.id === "capabilities"
      ? [
          question,
          ...CAPABILITIES.filter((item) =>
            capabilities.includes(item.id),
          ).flatMap((item) =>
            FOLLOWUPS[item.id] ? [FOLLOWUPS[item.id]!] : [],
          ),
        ]
      : [question],
  );
}
export function emptyDraft(idea = ""): ProductDraft {
  return {
    version: 1,
    answers: idea.trim() ? { problem: idea.slice(0, 4000) } : {},
    capabilities: [],
    capabilitiesAnswered: false,
  };
}
export function isAnswered(draft: ProductDraft, id: string) {
  return id === "capabilities"
    ? draft.capabilitiesAnswered
    : !!draft.answers[id]?.trim();
}
export function pendingQuestions(draft: ProductDraft) {
  return productQuestions(draft.capabilities).filter((q) =>
    q.id === "capabilities"
      ? !draft.capabilitiesAnswered || !draft.capabilities.length
      : !draft.answers[q.id]?.trim() || draft.answers[q.id] === UNKNOWN,
  );
}
export function buildProductBrief(draft: ProductDraft) {
  const sections = productQuestions(draft.capabilities).map(
    (q) =>
      `### ${q.title}\n${
        q.id === "capabilities"
          ? CAPABILITIES.filter((c) => draft.capabilities.includes(c.id))
              .map((c) => c.label)
              .join(", ") || UNKNOWN
          : draft.answers[q.id]?.trim() || UNKNOWN
      }`,
  );
  return `# Briefing de produto — descoberta guiada\n\n${sections.join("\n\n")}\n\n## Decisões pendentes\n${
    pendingQuestions(draft)
      .map((q) => `- ${q.title}`)
      .join("\n") ||
    "Nenhuma resposta em branco; as hipóteses ainda precisam ser validadas com usuários."
  }`;
}
export function productReviewPrompt(draft: ProductDraft) {
  return `${buildProductBrief(draft)}\n\n## Próximo passo solicitado\nAtue como um Product Manager sênior me orientando de forma acessível. Use as respostas acima e o contexto anterior; não repita perguntas já respondidas. Separe fatos relatados, hipóteses e decisões pendentes. Aprofunde primeiro a lacuna de maior impacto, com uma pergunta por vez e exemplos de escolhas. Se eu não souber, recomende um caminho explicando a troca envolvida, sem tratá-lo como aprovado. Quando houver contexto suficiente, proponha o escopo da primeira versão, o que fica de fora, a jornada principal, a medida de sucesso e critérios de aceite verificáveis (Dado/Quando/Então). Termine com a menor entrega útil e um teste com usuários. Nesta etapa, revise o briefing comigo; não implemente código nem publique até eu pedir a implementação.`;
}
export function appendProductBrief(current: string, brief: string) {
  return current.trim() ? `${current}\n\n${brief}` : brief;
}
const PREFIX = "samba:product-coach:v1:";
export function loadProductDraft(
  key: string,
  idea: string,
  storage: Pick<Storage, "getItem">,
): ProductDraft {
  const raw = storage.getItem(PREFIX + key);
  if (!raw) return emptyDraft(idea);
  if (raw.length > 100000) throw new Error("Rascunho excede o limite");
  const value = JSON.parse(raw);
  if (
    value?.version !== 1 ||
    !value.answers ||
    typeof value.answers !== "object" ||
    Array.isArray(value.answers) ||
    !Array.isArray(value.capabilities) ||
    value.capabilities.some(
      (id: unknown) => !CAPABILITIES.some((c) => c.id === id),
    ) ||
    typeof value.capabilitiesAnswered !== "boolean"
  )
    throw new Error("Rascunho incompatível");
  const answers: Answers = {};
  for (const q of productQuestions(CAPABILITIES.map((c) => c.id))) {
    const answer = value.answers[q.id];
    if (answer !== undefined) {
      if (typeof answer !== "string" || answer.length > 4000)
        throw new Error("Resposta inválida");
      answers[q.id] = answer;
    }
  }
  return {
    version: 1,
    answers,
    capabilities: [...new Set<Capability>(value.capabilities)],
    capabilitiesAnswered: value.capabilitiesAnswered,
  };
}
export function saveProductDraft(
  key: string,
  draft: ProductDraft,
  storage: Pick<Storage, "setItem">,
) {
  storage.setItem(PREFIX + key, JSON.stringify(draft));
}
