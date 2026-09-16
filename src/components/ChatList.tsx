import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import {
  differenceInCalendarDays,
  isToday,
  isYesterday,
} from "date-fns";
import {
  PlusCircle,
  Search,
  ArrowLeft,
} from "lucide-react";
import { useAtom, useSetAtom } from "jotai";
import {
  selectedChatIdAtom,
  removeChatIdFromAllTrackingAtom,
  ensureRecentViewedChatIdAtom,
} from "@/atoms/chatAtoms";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { dropdownOpenAtom } from "@/atoms/uiAtoms";
import { ipc } from "@/ipc/types";
import { showError, showSuccess } from "@/lib/toast";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useChats } from "@/hooks/useChats";
import { AppAvatar } from "@/components/AppAvatar";
import { RenameChatDialog } from "@/components/chat/RenameChatDialog";
import { DeleteChatDialog } from "@/components/chat/DeleteChatDialog";

import { ChatSearchDialog } from "./ChatSearchDialog";
import { useSelectChat } from "@/hooks/useSelectChat";
import { useLoadApps } from "@/hooks/useLoadApps";
import { useSetChatFavorite } from "@/hooks/useSetChatFavorite";
import { ChatItem } from "./ChatItem";

export function ChatList({
  show,
  showViewAllAppsButton,
  onViewAllApps,
}: {
  show?: boolean;
  showViewAllAppsButton?: boolean;
  onViewAllApps?: () => void;
}) {
  const { t } = useTranslation("chat");
  const navigate = useNavigate();
  const [selectedChatId, setSelectedChatId] = useAtom(selectedChatIdAtom);
  const [selectedAppId] = useAtom(selectedAppIdAtom);
  const [, setIsDropdownOpen] = useAtom(dropdownOpenAtom);

  const { chats, loading, invalidateChats } = useChats(selectedAppId);
  const { apps } = useLoadApps();
  const selectedApp = apps.find((app) => app.id === selectedAppId);

  const chatGroups = useMemo(() => {
    const favorites: typeof chats = [];
    const today: typeof chats = [];
    const yesterday: typeof chats = [];
    const thisWeek: typeof chats = [];
    const older: typeof chats = [];
    const now = new Date();

    for (const chat of chats) {
      if (chat.isFavorite) {
        favorites.push(chat);
        continue;
      }
      const date = new Date(chat.createdAt);
      if (isToday(date)) today.push(chat);
      else if (isYesterday(date)) yesterday.push(chat);
      else if (differenceInCalendarDays(now, date) < 7) thisWeek.push(chat);
      else older.push(chat);
    }

    return [
      { key: "favorites", label: t("favoriteChats"), chats: favorites },
      { key: "today", label: t("groupToday"), chats: today },
      { key: "yesterday", label: t("groupYesterday"), chats: yesterday },
      { key: "thisWeek", label: t("groupThisWeek"), chats: thisWeek },
      { key: "older", label: t("groupOlder"), chats: older },
    ].filter((group) => group.chats.length > 0);
  }, [chats, t]);
  const routerState = useRouterState();
  const isChatRoute = routerState.location.pathname === "/chat";

  // Rename dialog state
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameChatId, setRenameChatId] = useState<number | null>(null);
  const [renameChatTitle, setRenameChatTitle] = useState("");

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteChatId, setDeleteChatId] = useState<number | null>(null);
  const [deleteChatTitle, setDeleteChatTitle] = useState("");

  // search dialog state
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const { selectChat } = useSelectChat();
  const setChatFavorite = useSetChatFavorite();
  const [pendingFavoriteChatIds, setPendingFavoriteChatIds] = useState(
    () => new Set<number>(),
  );
  const [confirmedFavoriteChatIds, setConfirmedFavoriteChatIds] = useState(
    () => new Set<number>(),
  );
  const [favoriteAnnouncement, setFavoriteAnnouncement] = useState("");
  const [hoveredChatActionsId, setHoveredChatActionsId] = useState<
    number | null
  >(null);
  const [focusedChatActionsId, setFocusedChatActionsId] = useState<
    number | null
  >(null);
  const [openChatActionsId, setOpenChatActionsId] = useState<number | null>(
    null,
  );
  const favoriteButtonRefs = useRef(new Map<number, HTMLButtonElement>());
  const pendingFavoriteChatIdsRef = useRef(new Set<number>());
  const pendingFavoriteFocusChatId = useRef<number | null>(null);
  const favoriteAnimationTimers = useRef(new Map<number, number>());
  const removeChatIdFromAllTracking = useSetAtom(
    removeChatIdFromAllTrackingAtom,
  );
  const ensureRecentViewedChatId = useSetAtom(ensureRecentViewedChatIdAtom);

  useEffect(() => {
    const chatId = pendingFavoriteFocusChatId.current;
    if (chatId === null) return;

    const frame = window.requestAnimationFrame(() => {
      favoriteButtonRefs.current.get(chatId)?.focus({ preventScroll: true });
      pendingFavoriteFocusChatId.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chats]);

  useEffect(
    () => () => {
      for (const timer of favoriteAnimationTimers.current.values()) {
        window.clearTimeout(timer);
      }
    },
    [],
  );

  // Update selectedChatId when route changes and ensure chat appears in tabs.
  // Uses ensureRecentViewedChatId (not push) to avoid moving existing tabs to
  // the front on every navigation, which would defeat preserveTabOrder and
  // drag-to-reorder.
  useEffect(() => {
    if (isChatRoute) {
      const id = routerState.location.search.id;
      const chatId = Number(id);
      if (Number.isFinite(chatId) && chatId > 0) {
        setSelectedChatId(chatId);
        ensureRecentViewedChatId(chatId);
      }
    }
  }, [
    isChatRoute,
    routerState.location.search,
    setSelectedChatId,
    ensureRecentViewedChatId,
  ]);

  if (!show) {
    return;
  }

  const handleChatClick = ({
    chatId,
    appId,
  }: {
    chatId: number;
    appId: number;
  }) => {
    selectChat({ chatId, appId });
    setIsSearchDialogOpen(false);
  };

  const handleNewChat = async () => {
    // Only create a new chat if an app is selected
    if (selectedAppId) {
      try {
        // Create a new chat with an empty title for now
        const chatId = await ipc.chat.createChat({ appId: selectedAppId });

        // Refresh the chat list first so the new chat is in the cache
        // before selectChat adds it to the tab bar
        await invalidateChats();

        // Navigate to the new chat (use selectChat so it appears at front of tab bar)
        selectChat({ chatId, appId: selectedAppId });
      } catch (error) {
        // DO A TOAST
        showError(t("failedCreateChat", { error: (error as any).toString() }));
      }
    } else {
      // If no app is selected, navigate to home page
      navigate({ to: "/" });
    }
  };

  const handleDeleteChat = async (chatId: number) => {
    try {
      await ipc.chat.deleteChat(chatId);
      showSuccess(t("chatDeleted"));

      // Remove from tab tracking to prevent stale IDs
      removeChatIdFromAllTracking(chatId);

      // If the deleted chat was selected, navigate to home (matches tab-close behavior)
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
        if (selectedAppId) {
          navigate({ to: "/app-details", search: { appId: selectedAppId } });
        } else {
          navigate({ to: "/" });
        }
      }

      // Refresh the chat list
      await invalidateChats();
    } catch (error) {
      showError(t("failedDeleteChat", { error: (error as any).toString() }));
    }
  };

  const handleDeleteChatClick = (chatId: number, chatTitle: string) => {
    setDeleteChatId(chatId);
    setDeleteChatTitle(chatTitle);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteChatId !== null) {
      await handleDeleteChat(deleteChatId);
      setIsDeleteDialogOpen(false);
      setDeleteChatId(null);
      setDeleteChatTitle("");
    }
  };

  const handleRenameChat = (chatId: number, currentTitle: string) => {
    setRenameChatId(chatId);
    setRenameChatTitle(currentTitle);
    setIsRenameDialogOpen(true);
  };

  const handleRenameDialogClose = (open: boolean) => {
    setIsRenameDialogOpen(open);
    if (!open) {
      setRenameChatId(null);
      setRenameChatTitle("");
    }
  };

  const handleSetChatFavorite = async ({
    chatId,
    appId,
    title,
    isFavorite,
    restoreFocus,
  }: {
    chatId: number;
    appId: number;
    title: string;
    isFavorite: boolean;
    restoreFocus: boolean;
  }) => {
    if (pendingFavoriteChatIdsRef.current.has(chatId)) return;

    pendingFavoriteChatIdsRef.current.add(chatId);
    setPendingFavoriteChatIds((current) => new Set(current).add(chatId));
    if (restoreFocus) {
      pendingFavoriteFocusChatId.current = chatId;
    }

    try {
      await setChatFavorite.mutateAsync({ chatId, appId, isFavorite });
      setFavoriteAnnouncement(
        t(isFavorite ? "chatAddedToFavorites" : "chatRemovedFromFavorites", {
          title,
        }),
      );
      setConfirmedFavoriteChatIds((current) => new Set(current).add(chatId));

      const existingTimer = favoriteAnimationTimers.current.get(chatId);
      if (existingTimer !== undefined) window.clearTimeout(existingTimer);
      favoriteAnimationTimers.current.set(
        chatId,
        window.setTimeout(() => {
          setConfirmedFavoriteChatIds((current) => {
            const next = new Set(current);
            next.delete(chatId);
            return next;
          });
          favoriteAnimationTimers.current.delete(chatId);
        }, 240),
      );
    } catch (error) {
      if (restoreFocus) {
        pendingFavoriteFocusChatId.current = chatId;
        window.requestAnimationFrame(() => {
          favoriteButtonRefs.current
            .get(chatId)
            ?.focus({ preventScroll: true });
          pendingFavoriteFocusChatId.current = null;
        });
      }
      showError(
        t("failedUpdateChatFavorite", { error: (error as Error).message }),
      );
    } finally {
      pendingFavoriteChatIdsRef.current.delete(chatId);
      setPendingFavoriteChatIds((current) => {
        const next = new Set(current);
        next.delete(chatId);
        return next;
      });
    }
  };

  return (
    <>
      <SidebarGroup
        className="h-[calc(100vh-112px)] overflow-x-hidden overflow-y-auto"
        data-testid="chat-list-container"
      >
        {showViewAllAppsButton && (
          <div className="mx-2 mb-2 flex min-w-0 items-center gap-1">
            <Button
              onClick={onViewAllApps}
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 cursor-pointer hover:bg-sidebar-accent"
              title={t("viewAllApps")}
              aria-label={t("viewAllApps")}
              data-testid="view-all-apps-button"
            >
              <ArrowLeft size={16} />
            </Button>
            {selectedApp && (
              <>
                <AppAvatar
                  appId={selectedApp.id}
                  name={selectedApp.name}
                  className="h-5 w-5 rounded text-[9px]"
                />
                <div
                  className="min-w-0 flex-1 truncate text-sm font-semibold text-sidebar-foreground"
                  title={selectedApp.name}
                >
                  {selectedApp.name}
                </div>
              </>
            )}
          </div>
        )}
        <SidebarGroupContent>
          <div className="flex flex-col space-y-4">
            <div className="mx-2 flex items-center gap-2">
              <Button
                onClick={handleNewChat}
                variant="outline"
                className="flex flex-1 items-center justify-start gap-2 py-3"
                data-testid="new-chat-button"
              >
                <PlusCircle size={16} />
                <span>{t("newChat")}</span>
              </Button>
              <Button
                onClick={() => setIsSearchDialogOpen(!isSearchDialogOpen)}
                variant="outline"
                className="flex shrink-0 items-center justify-center py-3 px-3"
                title={t("searchChats")}
                aria-label={t("searchChats")}
                data-testid="search-chats-button"
              >
                <Search size={16} />
              </Button>
            </div>

            {loading ? (
              <div className="py-3 px-4 text-sm text-gray-500">
                {t("loadingChats")}
              </div>
            ) : chats.length === 0 ? (
              <div className="py-3 px-4 text-sm text-gray-500">
                {t("noChatsFound")}
              </div>
            ) : (
              <div className="flex flex-col space-y-3">
                {chatGroups.map((group) => (
                  <div key={group.key} data-testid={`chat-group-${group.key}`}>
                    <div className="px-3 pb-1 text-xs font-medium text-muted-foreground">
                      {group.label}
                    </div>
                    <SidebarMenu className="space-y-1">
                      {group.chats.map((chat) => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          isSelected={selectedChatId === chat.id}
                          onChatClick={handleChatClick}
                          onSetChatFavorite={handleSetChatFavorite}
                          onRenameChat={handleRenameChat}
                          onDeleteChatClick={handleDeleteChatClick}
                          isHovered={hoveredChatActionsId === chat.id}
                          isFocused={focusedChatActionsId === chat.id}
                          isOpen={openChatActionsId === chat.id}
                          setHoveredChatActionsId={setHoveredChatActionsId}
                          setFocusedChatActionsId={setFocusedChatActionsId}
                          setOpenChatActionsId={setOpenChatActionsId}
                          setIsDropdownOpen={setIsDropdownOpen}
                          isPendingFavorite={pendingFavoriteChatIds.has(chat.id)}
                          isConfirmedFavorite={confirmedFavoriteChatIds.has(chat.id)}
                          favoriteButtonRefs={favoriteButtonRefs}
                        />
                      ))}
                    </SidebarMenu>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Rename Chat Dialog */}
      {renameChatId !== null && (
        <RenameChatDialog
          chatId={renameChatId}
          currentTitle={renameChatTitle}
          isOpen={isRenameDialogOpen}
          onOpenChange={handleRenameDialogClose}
          onRename={invalidateChats}
        />
      )}

      {/* Delete Chat Dialog */}
      <DeleteChatDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirmDelete={handleConfirmDelete}
        chatTitle={deleteChatTitle}
      />

      {/* Chat Search Dialog */}
      <ChatSearchDialog
        open={isSearchDialogOpen}
        onOpenChange={setIsSearchDialogOpen}
        onSelectChat={handleChatClick}
        appId={selectedAppId}
        allChats={chats}
      />
      <p className="sr-only" role="status" aria-live="polite">
        {favoriteAnnouncement}
      </p>
    </>
  );
}
