import type { NativeRun } from "@/shared/native_agents";
export type NativeEvent =
  | { type: "started" }
  | { type: "output"; text: string }
  | { type: "approval"; approval: NonNullable<NativeRun["approval"]> }
  | { type: "answered" }
  | { type: "cancel" }
  | { type: "done" }
  | { type: "failed"; error: string };
export function isNativeRunActive(run: NativeRun) {
  return !["completed", "failed", "cancelled"].includes(run.phase);
}
export function nativeTransition(
  state: NativeRun,
  event: NativeEvent,
): NativeRun {
  if (!isNativeRunActive(state)) return state;
  switch (event.type) {
    case "output":
      return { ...state, output: (state.output + event.text).slice(-200_000) };
    case "cancel":
      return { ...state, phase: "cancelling", approval: undefined };
    case "done":
      return {
        ...state,
        phase: state.phase === "cancelling" ? "cancelled" : "completed",
        approval: undefined,
      };
    case "failed":
      return {
        ...state,
        phase: state.phase === "cancelling" ? "cancelled" : "failed",
        error: state.phase === "cancelling" ? undefined : event.error,
        approval: undefined,
      };
    case "started":
      return state.phase === "starting"
        ? { ...state, phase: "running" }
        : state;
    case "approval":
      return state.phase === "running"
        ? { ...state, phase: "approval", approval: event.approval }
        : state;
    case "answered":
      return state.phase === "approval"
        ? { ...state, phase: "running", approval: undefined }
        : state;
  }
}
