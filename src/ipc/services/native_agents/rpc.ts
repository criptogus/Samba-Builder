import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
export class AgentRpc {
  private next = 0;
  private pending = new Map<
    number,
    { resolve: (value: any) => void; reject: (error: Error) => void }
  >();
  private buffer = "";
  private decoder = new StringDecoder("utf8");
  private closed = false;
  onNotification: (method: string, params: any) => void = () => {};
  onRequest: (method: string, params: any) => Promise<unknown> = async () => {
    throw new Error("Método não suportado.");
  };
  constructor(private child: ChildProcessWithoutNullStreams) {
    child.stdout.on("data", (chunk) => this.consume(this.decoder.write(chunk)));
    child.stdin.on("error", (error) => this.fail(error));
    child.once("error", (error) => this.fail(error));
    child.once("close", () =>
      this.fail(new Error("O agente encerrou a conexão.")),
    );
  }
  private consume(chunk: string) {
    if (this.closed) return;
    this.buffer += chunk;
    if (this.buffer.length > 4_000_000) {
      this.fail(new Error("Resposta do agente excede o limite."));
      this.child.kill();
      return;
    }
    for (;;) {
      const end = this.buffer.indexOf("\n");
      if (end < 0) break;
      const line = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 1);
      let packet: any;
      try {
        packet = JSON.parse(line);
      } catch {
        continue;
      }
      if (!packet || typeof packet !== "object") continue;
      if (packet.method && packet.id !== undefined) {
        void Promise.resolve()
          .then(() => this.onRequest(packet.method, packet.params ?? {}))
          .then(
            (result) => this.send({ jsonrpc: "2.0", id: packet.id, result }),
            (error) =>
              this.send({
                jsonrpc: "2.0",
                id: packet.id,
                error: {
                  code: -32603,
                  message:
                    error instanceof Error ? error.message : "Falha no pedido.",
                },
              }),
          );
      } else if (packet.method) {
        try {
          this.onNotification(packet.method, packet.params ?? {});
        } catch (error) {
          this.fail(
            error instanceof Error
              ? error
              : new Error("Mensagem inválida do agente."),
          );
          this.child.kill();
        }
      } else {
        const request = this.pending.get(packet.id);
        if (!request) continue;
        this.pending.delete(packet.id);
        if (packet.error)
          request.reject(new Error(packet.error.message ?? "Erro do agente."));
        else request.resolve(packet.result);
      }
    }
  }
  private send(value: unknown) {
    if (!this.closed && this.child.stdin.writable)
      this.child.stdin.write(JSON.stringify(value) + "\n");
  }
  notify(method: string, params: unknown) {
    this.send({ jsonrpc: "2.0", method, params });
  }
  request(method: string, params: unknown): Promise<any> {
    if (this.closed) return Promise.reject(new Error("Conexão encerrada."));
    const id = ++this.next;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send({ jsonrpc: "2.0", id, method, params });
    });
  }
  fail(error: Error) {
    this.closed = true;
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}
