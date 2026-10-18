import { ipc } from "@/ipc/types";
import { AppSearchResult } from "@/lib/schemas";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

// ⚡ Bolt Optimization: Use stable reference for empty array to prevent unnecessary re-renders
const EMPTY_ARRAY: AppSearchResult[] = [];

export function useSearchApps(query: string) {
  const enabled = Boolean(query && query.trim().length > 0);

  const { data, isFetching, isLoading } = useQuery({
    queryKey: queryKeys.apps.search({ query }),
    enabled,
    queryFn: async (): Promise<AppSearchResult[]> => {
      return ipc.app.searchApps(query);
    },
    placeholderData: keepPreviousData,
    retry: 0,
  });

  return {
    apps: data ?? EMPTY_ARRAY,
    loading: enabled ? isFetching || isLoading : false,
  };
}
