import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import { EMPTY_ARRAY } from "@/lib/constants";

export function useLocalModels() {
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.languageModels.ollamaLocal,
    queryFn: async () => {
      const { models } = await ipc.languageModel.listOllamaModels();
      return models;
    },
    enabled: false,
  });

  const loadModels = useCallback(async () => {
    const result = await refetch();
    if (result.error) {
      console.error("Error loading local Ollama models:", result.error);
      return EMPTY_ARRAY;
    }
    return result.data ?? EMPTY_ARRAY;
  }, [refetch]);

  // ⚡ Bolt Optimization: Use shared EMPTY_ARRAY to prevent re-renders when returning fallback arrays
  return {
    models: data ?? EMPTY_ARRAY,
    loading: isFetching,
    error: error ?? null,
    loadModels,
  };
}
