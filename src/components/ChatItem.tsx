import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Trash2, Edit3, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useReducedMotionPref } from "@/hooks/useReducedMotion";
import type { ChatSummary } from "@/lib/schemas";

const CHAT_ACTION_SPRING = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.45,
};

type ChatItemProps = {
  chat: ChatSummary;
  selectedChatId: number | null;
  handleChatClick: (args: { chatId: number; appId: number }) => void;
  handleSetChatFavorite: (args: {
    chatId: number;
    appId: number;
    title: string;
    isFavorite: boolean;
    restoreFocus: boolean;
  }) => Promise<void>;
  handleRenameChat: (chatId: number, currentTitle: string) => void;
  handleDeleteChatClick: (chatId: number, chatTitle: string) => void;
  setIsDropdownOpen: (open: boolean) => void;
  pendingFavoriteChatIds: Set<number>;
  confirmedFavoriteChatIds: Set<number>;
  favoriteButtonRefCallback: (chatId: number, element: HTMLButtonElement | null) => void;
};

export const ChatItem = React.memo(function ChatItem({
  chat,
  selectedChatId,
  handleChatClick,
  handleSetChatFavorite,
  handleRenameChat,
  handleDeleteChatClick,
  setIsDropdownOpen,
  pendingFavoriteChatIds,
  confirmedFavoriteChatIds,
  favoriteButtonRefCallback,
}: ChatItemProps) {
  const { t } = useTranslation("chat");
  const reducedMotion = useReducedMotionPref();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDropdownOpen, setLocalIsDropdownOpen] = useState(false);

  useEffect(() => {
    setIsDropdownOpen(isDropdownOpen);
  }, [isDropdownOpen, setIsDropdownOpen]);

  return (
    <SidebarMenuItem className="mb-1">
      <div
        className="group/chat-row relative flex w-full items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsFocused(false);
          }
        }}
      >
        <Button
          variant="ghost"
          onClick={() =>
            handleChatClick({
              chatId: chat.id,
              appId: chat.appId,
            })
          }
          className={`justify-start w-full text-left py-3 pr-14 hover:bg-sidebar-accent/80 ${
            selectedChatId === chat.id
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : ""
          }`}
          data-testid={`chat-list-item-${chat.id}`}
        >
          <div className="flex flex-col w-full">
            <span className="truncate">{chat.title || t("newChat")}</span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
            </span>
          </div>
        </Button>

        <div className="absolute right-0 flex w-14 items-center">
          <motion.button
            ref={(element) => favoriteButtonRefCallback(chat.id, element)}
            type="button"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-[#6c55dc] focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              "aria-disabled:cursor-wait aria-disabled:opacity-60",
              !chat.isFavorite &&
                !confirmedFavoriteChatIds.has(chat.id) &&
                "pointer-events-none opacity-0 group-focus-within/chat-row:pointer-events-auto group-focus-within/chat-row:opacity-100",
              chat.isFavorite && "text-[#6c55dc]",
              "transition-[opacity,color] duration-200 ease-out motion-reduce:transition-none",
            )}
            initial={false}
            animate={{
              x: chat.isFavorite && !isHovered && !isFocused && !isDropdownOpen ? 28 : 0,
            }}
            transition={reducedMotion ? { duration: 0 } : CHAT_ACTION_SPRING}
            onClick={(event) => {
              event.stopPropagation();
              void handleSetChatFavorite({
                chatId: chat.id,
                appId: chat.appId,
                title: chat.title || t("newChat"),
                isFavorite: !chat.isFavorite,
                restoreFocus: event.detail === 0,
              });
            }}
            aria-disabled={pendingFavoriteChatIds.has(chat.id)}
            aria-label={t(
              chat.isFavorite ? "removeChatFromFavorites" : "addChatToFavorites",
              { title: chat.title || t("newChat") },
            )}
            aria-pressed={chat.isFavorite}
            title={t(chat.isFavorite ? "removeFromFavorites" : "addToFavorites")}
            data-testid={`chat-favorite-button-${chat.id}`}
          >
            <motion.span
              className="flex"
              initial={false}
              animate={
                confirmedFavoriteChatIds.has(chat.id) && !reducedMotion
                  ? { scale: [0.8, 1.2, 1] }
                  : { scale: 1 }
              }
              transition={{
                duration: 0.22,
                ease: "easeOut",
              }}
            >
              <Star
                className={cn(
                  "h-4 w-4 transition-colors motion-reduce:transition-none",
                  chat.isFavorite && "fill-current",
                )}
              />
            </motion.span>
          </motion.button>
          <DropdownMenu
            open={isDropdownOpen}
            onOpenChange={setLocalIsDropdownOpen}
            modal={false}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "pointer-events-none h-7 w-7 translate-x-1 scale-90 opacity-0 transition-[opacity,transform] duration-200 ease-out",
                  "group-hover/chat-row:pointer-events-auto group-hover/chat-row:translate-x-0 group-hover/chat-row:scale-100 group-hover/chat-row:opacity-100",
                  "group-focus-within/chat-row:pointer-events-auto group-focus-within/chat-row:translate-x-0 group-focus-within/chat-row:scale-100 group-focus-within/chat-row:opacity-100",
                  "data-[state=open]:pointer-events-auto data-[state=open]:translate-x-0 data-[state=open]:scale-100 data-[state=open]:opacity-100 motion-reduce:transition-none",
                )}
                onClick={(e) => e.stopPropagation()}
                aria-label={t("chatActions", {
                  title: chat.title || t("newChat"),
                })}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="space-y-1 p-2">
              <DropdownMenuItem
                onClick={(event) =>
                  void handleSetChatFavorite({
                    chatId: chat.id,
                    appId: chat.appId,
                    title: chat.title || t("newChat"),
                    isFavorite: !chat.isFavorite,
                    restoreFocus: event.detail === 0,
                  })
                }
                disabled={pendingFavoriteChatIds.has(chat.id)}
                className="px-3 py-2"
              >
                <Star
                  className={cn("mr-2 h-4 w-4", chat.isFavorite && "fill-current")}
                />
                <span>
                  {t(chat.isFavorite ? "removeFromFavorites" : "addToFavorites")}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRenameChat(chat.id, chat.title || "")}
                className="px-3 py-2"
              >
                <Edit3 className="mr-2 h-4 w-4" />
                <span>{t("renameChat")}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  handleDeleteChatClick(chat.id, chat.title || t("newChat"))
                }
                className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 focus:bg-red-50 dark:focus:bg-red-950/50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>{t("deleteChat")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </SidebarMenuItem>
  );
});
