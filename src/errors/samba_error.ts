/**
 * Classified application errors for IPC/main-process code.
 * Use {@link SambaError} with a {@link SambaErrorKind} so telemetry can ignore
 * high-volume, non-actionable failures (see `shouldFilterTelemetryException`).
 */

export enum SambaErrorKind {
  Validation = "validation",
  NotFound = "not_found",
  Auth = "auth",
  Precondition = "precondition",
  Conflict = "conflict",
  UserCancelled = "user_cancelled",
  RateLimited = "rate_limited",
  /** Upstream failures; reported to PostHog by default unless you add finer metadata later. */
  External = "external",
  /** Bugs, invariant violations, unexpected failures — always reported. */
  Internal = "internal",
  /** Unclassified; treated as reportable until call sites are migrated. */
  Unknown = "unknown",
}

const TELEMETRY_FILTERED_KINDS: ReadonlySet<SambaErrorKind> = new Set([
  SambaErrorKind.Validation,
  SambaErrorKind.NotFound,
  SambaErrorKind.Auth,
  SambaErrorKind.Precondition,
  SambaErrorKind.Conflict,
  SambaErrorKind.UserCancelled,
  SambaErrorKind.RateLimited,
]);

/**
 * Returns true if this kind should not be sent to PostHog as an `$exception` event.
 */
export function isSambaErrorKindFilteredFromTelemetry(
  kind: SambaErrorKind,
): boolean {
  return TELEMETRY_FILTERED_KINDS.has(kind);
}

export class SambaError extends Error {
  readonly kind: SambaErrorKind;
  readonly cause?: unknown;

  constructor(
    message: string,
    kind: SambaErrorKind,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = "SambaError";
    this.kind = kind;
    this.cause = options?.cause;
  }
}

export function isSambaError(error: unknown): error is SambaError {
  return error instanceof SambaError;
}
