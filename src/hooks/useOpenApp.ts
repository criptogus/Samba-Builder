import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { useNavigate } from "@tanstack/react-router";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";

export function useOpenApp() {
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);
  const navigate = useNavigate();

  // ⚡ Bolt Optimization:
  // Wrapped the returned function in useCallback. This maintains a stable function
  // reference across renders, preventing unnecessary re-renders in child list components
  // (e.g., AppItem) that depend on this callback.
  return useCallback(
    (appId: number) => {
      setSelectedAppId(appId);
      setSelectedChatId(null);
      navigate({ to: "/app-details", search: { appId } });
    },
    [setSelectedAppId, setSelectedChatId, navigate],
  );
}
