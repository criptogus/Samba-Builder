import { buildWindowsCommandInvocation } from "@/ipc/utils/windows_command";
import { runBufferedProcess } from "@/ipc/utils/buffered_process";
import { SambaError, SambaErrorKind } from "@/errors/samba_error";
import type { AwsConfig } from "@/ipc/types/aws";

export class CloudCommandError extends SambaError {
  constructor(
    message: string,
    readonly providerCode?: string,
  ) {
    super(message, SambaErrorKind.External);
  }
}
export async function cloudCommand(
  command: "aws" | "docker",
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
  timeoutMs = 60_000,
) {
  let result;
  try {
    result = await runBufferedProcess({
      ...buildWindowsCommandInvocation(
        process.platform === "win32" ? `${command}.exe` : command,
        args,
      ),
      cwd,
      env,
      shell: false,
      timeoutMs,
      maxOutputBytes: 256 * 1024,
      waitForCloseAfterForceKill: true,
    });
  } catch {
    throw new CloudCommandError(
      `${command} não está disponível. Instale ${command === "aws" ? "AWS CLI v2 e configure seu perfil/SSO" : "Docker Desktop e inicie o Docker"}.`,
    );
  }
  if (result.code !== 0 || result.timedOut || result.aborted) {
    // CLI stderr can contain credentials or source fragments. Only project the
    // provider's symbolic code; never log or return arbitrary command output.
    const code = result.stderr.match(
      /\(([A-Za-z][A-Za-z0-9]+Exception)\)/,
    )?.[1];
    throw new CloudCommandError(
      `${command} ${args.slice(0, 2).join(" ")}: ${result.timedOut ? "tempo limite excedido" : code || "falha na execução"}. Confira instalação, autenticação e permissões.`,
      code,
    );
  }
  if (result.stdoutTruncated && command === "aws")
    throw new CloudCommandError(
      "Resposta do provedor excedeu o limite de leitura.",
    );
  return result.stdout;
}
export async function awsCommand(
  config: AwsConfig,
  args: string[],
  cwd: string,
) {
  const output = await cloudCommand(
    "aws",
    [
      ...args,
      "--profile",
      config.profile,
      "--region",
      config.region,
      "--output",
      "json",
      "--no-cli-pager",
    ],
    cwd,
    { ...process.env, AWS_PAGER: "", AWS_CLI_AUTO_PROMPT: "off" },
  );
  try {
    return JSON.parse(output);
  } catch {
    throw new CloudCommandError("Resposta AWS inválida.");
  }
}
