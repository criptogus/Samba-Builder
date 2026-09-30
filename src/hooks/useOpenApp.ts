import { useSetAtom } from "jotai";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";

export function useOpenApp() {
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);
  const navigate = useNavigate();

  // Wrap the callback in useCallback to prevent it from silently breaking
  // React.memo shallow comparison in list components that rely on this hook
  // (e.g. AppList passing it down to AppItem).
  return useCallback(
    (appId: number) => {
      setSelectedAppId(appId);
      setSelectedChatId(null);
      navigate({ to: "/app-details", search: { appId } });
    },
    [setSelectedAppId, setSelectedChatId, navigate]
  );
}
