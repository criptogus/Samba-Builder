import { AgentRpc } from "./rpc";
import { spawnAgent, stopChild } from "./process";
import type { NativeAgent } from "@/shared/native_agents";
export interface DriverContext {
  executable: string;
  cwd: string;
  prompt: string;
  controller: AbortController;
  append(text: string): void;
  ask(
    title: string,
    detail: unknown,
    question?: boolean,
  ): Promise<{ allow: boolean; text?: string }>;
  setInput(write: ((text: string) => void) | null): void;
}
export async function loginAgent(
  provider: NativeAgent,
  context: DriverContext,
) {
  const args =
    provider === "codex"
      ? ["login", "--device-auth"]
      : provider === "claude"
        ? ["auth", "login", "--claudeai"]
        : ["login", "--device-auth"];
  const child = spawnAgent(
    context.executable,
    args,
    context.cwd,
    context.controller.signal,
  );
  context.setInput((text) => child.stdin.write(text + "\n"));
  child.stdout.on("data", (data) => context.append(data.toString()));
  child.stderr.on("data", (data) => context.append(data.toString()));
  try {
    await new Promise<void>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Login encerrado com código ${code}.`)),
      );
    });
  } finally {
    context.setInput(null);
    await stopChild(child);
  }
}
export async function runCodex(context: DriverContext) {
  const child = spawnAgent(
    context.executable,
    ["app-server", "--listen", "stdio://"],
    context.cwd,
    context.controller.signal,
  );
  const rpc = new AgentRpc(child);
  child.stderr.on("data", () => {});
  let finish!: () => void;
  let fail!: (error: Error) => void;
  const completed = new Promise<void>((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  // A transport failure may happen while initialization is still pending.
  void completed.catch(() => {});
  child.once("close", () =>
    fail(new Error("Codex encerrou antes de concluir a tarefa.")),
  );
  child.once("error", fail);
  rpc.onNotification = (method, params) => {
    if (method === "item/agentMessage/delta")
      context.append(params.delta ?? "");
    if (method === "turn/completed") {
      if (params.turn?.status === "completed") finish();
      else
        fail(
          new Error(
            params.turn?.error?.message ?? "Tarefa Codex interrompida.",
          ),
        );
    }
  };
  rpc.onRequest = async (method, params) => {
    if (
      method === "item/commandExecution/requestApproval" ||
      method === "item/fileChange/requestApproval"
    ) {
      const answer = await context.ask(
        method.includes("commandExecution")
          ? "Codex quer executar um comando"
          : "Codex quer alterar arquivos",
        params,
      );
      return { decision: answer.allow ? "accept" : "decline" };
    }
    if (method === "item/tool/requestUserInput") {
      const answers: Record<string, { answers: string[] }> = {};
      for (const question of params.questions ?? []) {
        const answer = await context.ask(
          "Codex precisa de uma resposta",
          question,
          true,
        );
        answers[question.id] = {
          answers: [
            answer.allow ? (answer.text ?? "") : "Cancelado pelo usuário",
          ],
        };
      }
      return { answers };
    }
    throw new Error(`Pedido Codex não suportado: ${method}`);
  };
  try {
    await rpc.request("initialize", {
      clientInfo: {
        name: "samba_builder",
        title: "Samba Builder",
        version: "1.0.0",
      },
    });
    rpc.notify("initialized", {});
    const account = await rpc.request("account/read", {});
    if (!account.account)
      throw new Error("Conecte sua conta no Codex antes de executar.");
    const result = await rpc.request("thread/start", {
      cwd: context.cwd,
      approvalPolicy: "on-request",
      sandbox: "workspace-write",
      ephemeral: true,
    });
    await rpc.request("turn/start", {
      threadId: result.thread.id,
      input: [{ type: "text", text: context.prompt, text_elements: [] }],
    });
    await completed;
  } finally {
    await stopChild(child);
    rpc.fail(new Error("Sessão finalizada."));
  }
}
export async function runClaude(context: DriverContext) {
  const { query } = await import("@anthropic-ai/claude-agent-sdk");
  const spawned: ReturnType<typeof spawnAgent>[] = [];
  const stream = query({
    prompt: context.prompt,
    options: {
      cwd: context.cwd,
      pathToClaudeCodeExecutable: context.executable,
      abortController: context.controller,
      permissionMode: "default",
      maxTurns: 50,
      settingSources: [],
      spawnClaudeCodeProcess: (options) => {
        const child = spawnAgent(
          options.command,
          options.args,
          options.cwd ?? context.cwd,
          context.controller.signal,
          options.env,
        );
        spawned.push(child);
        return child;
      },
      canUseTool: async (tool, input) => {
        if (tool === "AskUserQuestion") {
          const answers: Record<string, string> = {};
          for (const question of (input.questions ?? []) as {
            question: string;
          }[]) {
            const answer = await context.ask(
              "Claude Code precisa de uma resposta",
              question,
              true,
            );
            if (!answer.allow)
              return {
                behavior: "deny",
                message: "O usuário cancelou a pergunta.",
              };
            answers[question.question] = answer.text ?? "";
          }
          return { behavior: "allow", updatedInput: { ...input, answers } };
        }
        const answer = await context.ask(`Claude Code: ${tool}`, input);
        return answer.allow
          ? { behavior: "allow", updatedInput: input }
          : { behavior: "deny", message: "O usuário não aprovou esta ação." };
      },
    },
  });
  try {
    for await (const message of stream) {
      if (message.type === "assistant")
        for (const block of message.message.content)
          if (block.type === "text") context.append(block.text + "\n");
      if (message.type === "result" && message.is_error)
        throw new Error(
          "errors" in message
            ? message.errors.join("\n")
            : "Claude Code não concluiu a tarefa.",
        );
    }
  } finally {
    stream.close();
    await Promise.all(spawned.map(stopChild));
  }
}
export async function runGrok(context: DriverContext) {
  const child = spawnAgent(
    context.executable,
    ["agent", "--no-leader", "stdio"],
    context.cwd,
    context.controller.signal,
  );
  const rpc = new AgentRpc(child);
  child.stderr.on("data", () => {});
  rpc.onNotification = (method, params) => {
    if (
      method === "session/update" &&
      params.update?.sessionUpdate === "agent_message_chunk" &&
      params.update.content?.type === "text"
    )
      context.append(params.update.content.text);
  };
  rpc.onRequest = async (method, params) => {
    if (method !== "session/request_permission")
      throw new Error(`Pedido Grok não suportado: ${method}`);
    const answer = await context.ask("Grok pede autorização", params.toolCall);
    const option = (params.options ?? []).find(
      (option: any) =>
        option.kind === (answer.allow ? "allow_once" : "reject_once"),
    );
    return {
      outcome: option
        ? { outcome: "selected", optionId: option.optionId }
        : { outcome: "cancelled" },
    };
  };
  try {
    await rpc.request("initialize", {
      protocolVersion: 1,
      clientInfo: { name: "samba-builder", version: "1.0.0" },
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
      },
    });
    const session = await rpc.request("session/new", {
      cwd: context.cwd,
      mcpServers: [],
    });
    const result = await rpc.request("session/prompt", {
      sessionId: session.sessionId,
      prompt: [{ type: "text", text: context.prompt }],
    });
    if (result.stopReason !== "end_turn")
      throw new Error(`Grok encerrou a tarefa: ${result.stopReason}.`);
  } finally {
    await stopChild(child);
    rpc.fail(new Error("Sessão finalizada."));
  }
}
export const taskDrivers = {
  codex: runCodex,
  claude: runClaude,
  grok: runGrok,
};
