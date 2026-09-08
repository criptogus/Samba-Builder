import { useEffect, useReducer, useRef } from "react";
import { importTransition } from "./transition";
import * as commands from "./commands";

export function useMeetingImport() {
  const [state, dispatch] = useReducer(importTransition, { type: "idle" });
  const requestRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (requestRef.current)
        void commands.cancelAudio(requestRef.current).catch(() => {});
      requestRef.current = null;
    },
    [],
  );
  const cancel = () => {
    if (requestRef.current)
      void commands.cancelAudio(requestRef.current).catch(() => {});
    requestRef.current = null;
    dispatch({ type: "cancel" });
  };
  const run = async (
    command: (id: string) => Promise<{ text: string; filename: string } | null>,
  ) => {
    if (requestRef.current) return;
    const id = crypto.randomUUID();
    requestRef.current = id;
    dispatch({ type: "begin", id });
    try {
      const result = await command(id);
      if (requestRef.current !== id) return;
      if (result) dispatch({ type: "success", id, ...result });
      else dispatch({ type: "cancel" });
    } catch (error) {
      dispatch({
        type: "failure",
        id,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível importar a gravação.",
      });
    } finally {
      if (requestRef.current === id) requestRef.current = null;
    }
  };
  return {
    state,
    pending: state.type === "loading",
    cancel,
    audio: () => run(commands.importAudio),
    importText: (file?: File) =>
      file ? run(() => commands.importTranscript(file)) : Promise.resolve(),
  };
}
