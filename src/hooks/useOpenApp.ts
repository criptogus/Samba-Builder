import { useSetAtom } from "jotai";
import { useNavigate } from "@tanstack/react-router";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { useCallback } from "react";

export function useOpenApp() {
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);
  const navigate = useNavigate();

  // ⚡ Bolt: Wrapped in useCallback to preserve referential equality and prevent
  // full list re-renders when this handler is passed to memoized AppItem child components.
  return useCallback((appId: number) => {
    setSelectedAppId(appId);
    setSelectedChatId(null);
    navigate({ to: "/app-details", search: { appId } });
  }, [setSelectedAppId, setSelectedChatId, navigate]);
}
