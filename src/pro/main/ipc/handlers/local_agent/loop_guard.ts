import { createHash } from "node:crypto";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import type { AgentContext } from "./tools/types";

/**
 * Guardas de higiene do loop do agente (REQ-20), inspiradas no grupo `guard/`
 * do DeepSeek Harness:
 *
 * 1. **Chamada repetida** — o modelo às vezes repete exatamente a mesma tool com
 *    os mesmos argumentos. Em vez de deixar queimar tokens, o resultado volta com
 *    um lembrete para mudar de abordagem ou concluir.
 * 2. **Timeout por tool** — chamadas que podem travar a sessão têm um teto, e o
 *    modelo recebe um erro claro em vez de esperar para sempre.
 *
 * O timeout limita **a espera do agente**, não o trabalho em si: um processo já
 * iniciado continua sujeito aos seus próprios limites.
 */

export const REPEATED_TOOL_CALL_THRESHOLD = 3;

/**
 * Teto por tool para chamadas longas. Hoje é uma política central; o próximo
 * passo é cada tool declarar o próprio `timeoutMs` e esta tabela cair.
 */
export const TOOL_TIMEOUTS_MS: Record<string, number> = {
  execute_sandbox_script: 5 * 60_000,
  run_repo_command: 5 * 60_000,
  add_dependency: 15 * 60_000,
  run_tests: 20 * 60_000,
  run_build: 20 * 60_000,
  reinstall_and_restart_app: 20 * 60_000,
};

export function toolTimeoutMs(toolName: string): number | undefined {
  return TOOL_TIMEOUTS_MS[toolName];
}

/** Serializa argumentos com chaves ordenadas, para o hash não depender da ordem. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
  return `{${entries.join(",")}}`;
}

export function toolCallSignature(toolName: string, args: unknown): string {
  return createHash("sha256")
    .update(`${toolName}\0${stableStringify(args)}`)
    .digest("hex")
    .slice(0, 16);
}

export interface RepeatedToolCallState {
  count: number;
  repeated: boolean;
}

/** Conta chamadas idênticas dentro de um turno. */
export class RepeatedToolCallGuard {
  private readonly counts = new Map<string, number>();

  note(toolName: string, args: unknown): RepeatedToolCallState {
    const key = toolCallSignature(toolName, args);
    const count = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, count);
    return { count, repeated: count >= REPEATED_TOOL_CALL_THRESHOLD };
  }
}

const guards = new WeakMap<AgentContext, RepeatedToolCallGuard>();

/** Guarda do turno atual (o contexto do agente já é por turno). */
export function repeatedToolCallsFor(ctx: AgentContext): RepeatedToolCallGuard {
  let guard = guards.get(ctx);
  if (!guard) {
    guard = new RepeatedToolCallGuard();
    guards.set(ctx, guard);
  }
  return guard;
}

export function repeatedToolCallReminder(
  toolName: string,
  count: number,
): string {
  return [
    "",
    "",
    `<samba-loop-notice>Você chamou \`${toolName}\` ${count} vezes com exatamente os mesmos argumentos e o estado não mudou.`,
    "Pare de repetir: explique o que está bloqueando, tente uma abordagem diferente ou conclua o turno pedindo o que falta.</samba-loop-notice>",
  ].join("\n");
}

export interface ToolTimeoutParams<T> {
  toolName: string;
  timeoutMs?: number;
  run: () => Promise<T>;
}

/**
 * Executa a tool com teto de tempo quando ela declara um. Sem limite, apenas
 * executa — esta função nunca muda o comportamento de tools sem timeout.
 */
export async function runToolWithTimeout<T>({
  toolName,
  timeoutMs,
  run,
}: ToolTimeoutParams<T>): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) {
    return run();
  }

  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new SambaError(
          `A tool "${toolName}" excedeu o limite de ${Math.round(timeoutMs / 1000)}s e foi interrompida. Tente de novo com um escopo menor ou investigue por que ela não terminou.`,
          SambaErrorKind.Precondition,
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([run(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
