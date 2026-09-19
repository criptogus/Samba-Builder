import { useSetAtom } from "jotai";
import { useNavigate } from "@tanstack/react-router";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { useCallback } from "react";

export function useOpenApp() {
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);
  const navigate = useNavigate();

  // ⚡ Bolt: Wrapped in useCallback to prevent breaking React.memo shallow
  // comparisons in parent components like AppList that pass this down to
  // list items. Prevents full re-rendering of AppList items when selected app changes.
  return useCallback(
    (appId: number) => {
      setSelectedAppId(appId);
      setSelectedChatId(null);
      navigate({ to: "/app-details", search: { appId } });
    },
    [navigate, setSelectedAppId, setSelectedChatId],
  );
}
