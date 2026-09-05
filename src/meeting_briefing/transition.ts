import type { ImportEvent, ImportState } from "./state";
export function importTransition(
  state: ImportState,
  event: ImportEvent,
): ImportState {
  switch (event.type) {
    case "begin":
      return state.type === "loading"
        ? state
        : { type: "loading", id: event.id };
    case "cancel":
      return { type: "idle" };
    case "success":
      return state.type === "loading" && state.id === event.id
        ? { type: "ready", text: event.text, filename: event.filename }
        : state;
    case "failure":
      return state.type === "loading" && state.id === event.id
        ? { type: "error", message: event.message }
        : state;
    default: {
      const unreachable: never = event;
      return unreachable;
    }
  }
}
