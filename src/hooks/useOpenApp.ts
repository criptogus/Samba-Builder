import { useSetAtom } from "jotai";
import { useNavigate } from "@tanstack/react-router";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { useCallback } from "react";

export function useOpenApp() {
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);
  const navigate = useNavigate();

  // ⚡ Bolt: Wraps returned function in useCallback to preserve reference equality.
  // This prevents full re-renders of list components (e.g., AppList) where
  // AppItem receives this function as a prop and uses React.memo for shallow comparison.
  // Expected impact: Eliminates O(N) re-renders in large app lists on parent state changes.
  return useCallback(
    (appId: number) => {
      setSelectedAppId(appId);
      setSelectedChatId(null);
      navigate({ to: "/app-details", search: { appId } });
    },
    [setSelectedAppId, setSelectedChatId, navigate],
  );
}
