import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { useNavigate } from "@tanstack/react-router";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";

export function useOpenApp() {
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);
  const navigate = useNavigate();

  // ⚡ Bolt Optimization: Memoize the returned function to prevent
  // unnecessary re-renders in components like AppList where this is passed
  // as a prop or used in dependency arrays.
  return useCallback(
    (appId: number) => {
      setSelectedAppId(appId);
      setSelectedChatId(null);
      navigate({ to: "/app-details", search: { appId } });
    },
    [setSelectedAppId, setSelectedChatId, navigate],
  );
}
