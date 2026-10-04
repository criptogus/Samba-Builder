import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { useNavigate } from "@tanstack/react-router";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";

export function useOpenApp() {
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);
  const navigate = useNavigate();

  // ⚡ Bolt Optimization: Wrap callback in useCallback to prevent breaking React.memo in list items
  return useCallback(
    (appId: number) => {
      setSelectedAppId(appId);
      setSelectedChatId(null);
      navigate({ to: "/app-details", search: { appId } });
    },
    [navigate, setSelectedAppId, setSelectedChatId],
  );
}
