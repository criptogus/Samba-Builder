import { SambaError, SambaErrorKind, isSambaError } from "@/errors/samba_error";
import type { SandboxHostCallName } from "./capabilities";
import type { SandboxRunResult } from "./execution";

export interface SandboxWorkerInput {
  appPath: string;
  script: string;
  timeoutMs: number;
  persistFullOutput?: boolean;
}

export interface SandboxWorkerHostCall {
  name: SandboxHostCallName;
  path?: string;
}

export interface SerializedSandboxWorkerError {
  name?: string;
  message: string;
  kind?: SambaErrorKind;
  stack?: string;
}

export type SandboxWorkerMessage =
  | { type: "vmBudgetStart" }
  | { type: "vmBudgetPause" }
  | { type: "vmBudgetResume" }
  | { type: "hostCall"; hostCall: SandboxWorkerHostCall }
  | { type: "result"; result: SandboxRunResult }
  | { type: "error"; error: SerializedSandboxWorkerError };

export function serializeSandboxWorkerError(
  error: unknown,
): SerializedSandboxWorkerError {
  if (isSambaError(error)) {
    return {
      name: error.name,
      message: error.message,
      kind: error.kind,
      stack: error.stack,
    };
  }
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    message: String(error),
  };
}

function isSambaErrorKind(value: unknown): value is SambaErrorKind {
  return (
    typeof value === "string" &&
    Object.values(SambaErrorKind).includes(value as SambaErrorKind)
  );
}

export function deserializeSandboxWorkerError(
  error: SerializedSandboxWorkerError,
): Error {
  if (isSambaErrorKind(error.kind)) {
    const sambaError = new SambaError(error.message, error.kind);
    sambaError.stack = error.stack;
    return sambaError;
  }

  const genericError = new Error(error.message);
  genericError.name = error.name ?? genericError.name;
  genericError.stack = error.stack;
  return genericError;
}
