export type ImportState =
  | { type: "idle" }
  | { type: "loading"; id: string }
  | { type: "ready"; text: string; filename: string }
  | { type: "error"; message: string };
export type ImportEvent =
  | { type: "begin"; id: string }
  | { type: "success"; id: string; text: string; filename: string }
  | { type: "failure"; id: string; message: string }
  | { type: "cancel" };
