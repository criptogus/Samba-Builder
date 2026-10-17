import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import type { ListedApp } from "@/ipc/types/app";

const EMPTY_APPS: ListedApp[] = [];

export function useLoadApps() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.apps.all,
    queryFn: async () => {
      const appListResponse = await ipc.app.listApps();
      return appListResponse.apps;
    },
  });

  const refreshApps = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.appCollections.all });
    return queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
  }, [queryClient]);

  // ⚡ Bolt Optimization: Memoize return object and use stable array for fallback
  // to avoid breaking React.memo shallow comparisons in consumer list items.
  return useMemo(
    () => ({
      apps: data ?? EMPTY_APPS,
      loading: isLoading,
      error: error ?? null,
      refreshApps,
    }),
    [data, isLoading, error, refreshApps],
  );
}
