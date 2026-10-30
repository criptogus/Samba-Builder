import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ipc, type LocalModel } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import { EMPTY_ARRAY } from "@/lib/constants";

export function useLocalLMSModels() {
  const { data, isFetching, error, refetch } = useQuery<LocalModel[], Error>({
    queryKey: queryKeys.languageModels.lmStudioLocal,
    queryFn: async () => {
      const { models } = await ipc.languageModel.listLMStudioModels();
      return models;
    },
    enabled: false,
  });

  const loadModels = useCallback(async () => {
    const result = await refetch();
    if (result.error) {
      console.error("Error loading local LMStudio models:", result.error);
      return EMPTY_ARRAY;
    }
    return result.data ?? EMPTY_ARRAY;
  }, [refetch]);

  // ⚡ Bolt Optimization: Use stable EMPTY_ARRAY reference to prevent re-renders
  return {
    models: data ?? EMPTY_ARRAY,
    loading: isFetching,
    error: error ?? null,
    loadModels,
  };
}
