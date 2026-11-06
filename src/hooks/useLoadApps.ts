import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import type { ListedApp } from "@/ipc/types/app";

// ⚡ Bolt Optimization: Use stable reference for empty array to prevent unnecessary re-renders
const EMPTY_ARRAY: ListedApp[] = [];

export function useLoadApps() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.apps.all,
    queryFn: async () => {
      const appListResponse = await ipc.app.listApps();
      return appListResponse.apps;
    },
  });

  const refreshApps = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.appCollections.all });
    return queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
  };

  return {
    apps: data ?? EMPTY_ARRAY,
    loading: isLoading,
    error: error ?? null,
    refreshApps,
  };
}
