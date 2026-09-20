import { useSetAtom } from "jotai";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";

export function useOpenApp() {
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);
  const navigate = useNavigate();

  // Memoizing the callback prevents unnecessary re-renders of list items (like AppItem)
  // that rely on this callback and use React.memo.
  return useCallback(
    (appId: number) => {
      setSelectedAppId(appId);
      setSelectedChatId(null);
      navigate({ to: "/app-details", search: { appId } });
    },
    [setSelectedAppId, setSelectedChatId, navigate],
  );
}
