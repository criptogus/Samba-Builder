import { stripVTControlCharacters } from "node:util";
import { randomUUID } from "node:crypto";
import type { NativeRun, NativeAgent } from "@/shared/native_agents";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import { withLock } from "../../utils/lock_utils";
import { nativeTransition, isNativeRunActive } from "./transition";
import type { DriverContext } from "./drivers";
interface RecordState {
  owner: number;
  state: NativeRun;
  controller: AbortController;
  answer?: (answer: { allow: boolean; text?: string }) => void;
  input?: ((text: string) => void) | null;
}
export class NativeAgentRegistry {
  private current?: RecordState;
  start(
    owner: number,
    provider: NativeAgent,
    kind: NativeRun["kind"],
    execute: (
      runtime: Omit<DriverContext, "executable" | "cwd" | "prompt">,
    ) => Promise<void>,
  ) {
    if (this.current && isNativeRunActive(this.current.state))
      throw new SambaError(
        "Já há um agente local em execução. Aguarde ou encerre a sessão atual.",
        SambaErrorKind.Conflict,
      );
    const record: RecordState = {
      owner,
      state: {
        id: randomUUID(),
        provider,
        kind,
        phase: "starting",
        output: "",
      },
      controller: new AbortController(),
    };
    this.current = record;
    const transition = (event: Parameters<typeof nativeTransition>[1]) => {
      record.state = nativeTransition(record.state, event);
    };
    const timer = setTimeout(
      () => {
        transition({ type: "cancel" });
        record.controller.abort();
        record.answer?.({ allow: false });
      },
      kind === "login" ? 10 * 60_000 : 30 * 60_000,
    );
    timer.unref();
    void Promise.resolve()
      .then(async () => {
        record.controller.signal.throwIfAborted();
        transition({ type: "started" });
        await execute({
          controller: record.controller,
          append: (text) =>
            transition({
              type: "output",
              text: stripVTControlCharacters(text),
            }),
          setInput: (input) => {
            record.input = input;
          },
          ask: (title, detail, question = false) =>
            withLock(`native-agent-approval:${record.state.id}`, async () => {
              record.controller.signal.throwIfAborted();
              const id = randomUUID();
              transition({
                type: "approval",
                approval: {
                  id,
                  title,
                  detail: (JSON.stringify(detail, null, 2) ?? "").slice(
                    0,
                    24_000,
                  ),
                  question,
                },
              });
              try {
                return await new Promise<{ allow: boolean; text?: string }>(
                  (resolve) => {
                    record.answer = resolve;
                  },
                );
              } finally {
                record.answer = undefined;
                transition({ type: "answered" });
              }
            }),
        });
        transition({ type: "done" });
      })
      .catch((error) =>
        transition({
          type: "failed",
          error:
            error instanceof Error
              ? error.message
              : "O agente não concluiu a tarefa.",
        }),
      )
      .finally(() => {
        clearTimeout(timer);
        record.input = null;
      });
    return record.state;
  }
  private owned(id: string, owner: number) {
    if (
      !this.current ||
      this.current.state.id !== id ||
      this.current.owner !== owner
    )
      throw new SambaError(
        "Sessão não pertence a esta janela ou já foi encerrada.",
        SambaErrorKind.NotFound,
      );
    return this.current;
  }
  read(id: string, owner: number) {
    return this.owned(id, owner).state;
  }
  respond(
    id: string,
    owner: number,
    approvalId: string,
    allow: boolean,
    text?: string,
  ) {
    const record = this.owned(id, owner);
    if (
      record.state.phase !== "approval" ||
      record.state.approval?.id !== approvalId ||
      !record.answer
    )
      throw new SambaError(
        "Este pedido não está mais ativo.",
        SambaErrorKind.Conflict,
      );
    const answer = record.answer;
    record.answer = undefined;
    answer({ allow, text });
  }
  input(id: string, owner: number, text: string) {
    const record = this.owned(id, owner);
    if (record.state.kind !== "login" || !record.input)
      throw new SambaError(
        "O login não está aguardando entrada.",
        SambaErrorKind.Precondition,
      );
    record.input(text);
  }
  cancel(id: string, owner: number) {
    const record = this.owned(id, owner);
    if (!isNativeRunActive(record.state)) return;
    record.state = nativeTransition(record.state, { type: "cancel" });
    record.controller.abort();
    record.answer?.({ allow: false });
  }
  cancelOwner(owner: number) {
    if (this.current?.owner === owner)
      this.cancel(this.current.state.id, owner);
  }
  shutdown() {
    if (this.current) this.cancel(this.current.state.id, this.current.owner);
  }
}
