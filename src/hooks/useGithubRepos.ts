import { useQuery } from "@tanstack/react-query";
import { ipc, GithubRepository } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";

// ⚡ Bolt Optimization: Use stable reference for empty array to prevent unnecessary re-renders
const EMPTY_ARRAY: GithubRepository[] = [];

export function useGithubRepos({ enabled }: { enabled: boolean }) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.github.repos,
    queryFn: () => ipc.github.listRepos(),
    enabled,
    meta: { showErrorToast: true },
  });

  return {
    repos: data ?? EMPTY_ARRAY,
    loading: isLoading,
    error,
  };
}
