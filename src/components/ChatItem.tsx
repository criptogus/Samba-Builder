import { memo } from "react";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Trash2, Edit3, Star } from "lucide-react";
import { motion } from "framer-motion";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Chat } from "@/ipc/types";
import { useTranslation } from "react-i18next";
import { useReducedMotionPref } from "@/hooks/useReducedMotion";

const CHAT_ACTION_SPRING = {
  type: "spring" as const,
  stiffness: 750,
  damping: 34,
  mass: 0.45,
};

interface ChatItemProps {
  chat: Chat;
  isSelected: boolean;
  onChatClick: (args: { chatId: number; appId: number }) => void;
  onSetChatFavorite: (args: {
    chatId: number;
    appId: number;
    title: string;
    isFavorite: boolean;
    restoreFocus: boolean;
  }) => void;
  onRenameChat: (chatId: number, currentTitle: string) => void;
  onDeleteChatClick: (chatId: number, chatTitle: string) => void;
  isHovered: boolean;
  isFocused: boolean;
  isOpen: boolean;
  setHoveredChatActionsId: (id: number | null) => void;
  setFocusedChatActionsId: (id: number | null) => void;
  setOpenChatActionsId: (id: number | null) => void;
  setIsDropdownOpen: (open: boolean) => void;
  isPendingFavorite: boolean;
  isConfirmedFavorite: boolean;
  favoriteButtonRefs: React.MutableRefObject<Map<number, HTMLButtonElement>>;
}

export const ChatItem = memo(function ChatItem({
  chat,
  isSelected,
  onChatClick,
  onSetChatFavorite,
  onRenameChat,
  onDeleteChatClick,
  isHovered,
  isFocused,
  isOpen,
  setHoveredChatActionsId,
  setFocusedChatActionsId,
  setOpenChatActionsId,
  setIsDropdownOpen,
  isPendingFavorite,
  isConfirmedFavorite,
  favoriteButtonRefs,
}: ChatItemProps) {
  const { t } = useTranslation("chat");
  const reducedMotion = useReducedMotionPref();

  return (
    <SidebarMenuItem className="mb-1">
      <div
        className="group/chat-row relative flex w-full items-center"
        onMouseEnter={() => setHoveredChatActionsId(chat.id)}
        onMouseLeave={() => setHoveredChatActionsId(null)}
        onFocusCapture={() => setFocusedChatActionsId(chat.id)}
        onBlurCapture={(event) => {
          if (
            !event.currentTarget.contains(
              event.relatedTarget as Node | null,
            )
          ) {
            setFocusedChatActionsId(null);
          }
        }}
      >
        <Button
          variant="ghost"
          onClick={() =>
            onChatClick({
              chatId: chat.id,
              appId: chat.appId,
            })
          }
          className={`justify-start w-full text-left py-3 pr-14 hover:bg-sidebar-accent/80 ${
            isSelected
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : ""
          }`}
          data-testid={`chat-list-item-${chat.id}`}
        >
          <div className="flex flex-col w-full">
            <span className="truncate">
              {chat.title || t("newChat")}
            </span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(chat.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </Button>

        <div className="absolute right-0 flex w-14 items-center">
          <motion.button
            ref={(element: HTMLButtonElement | null) => {
              if (element) {
                favoriteButtonRefs.current.set(chat.id, element);
              } else {
                favoriteButtonRefs.current.delete(chat.id);
              }
            }}
            type="button"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-[#6c55dc] focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              "aria-disabled:cursor-wait aria-disabled:opacity-60",
              !chat.isFavorite &&
                !isConfirmedFavorite &&
                "pointer-events-none opacity-0 group-focus-within/chat-row:pointer-events-auto group-focus-within/chat-row:opacity-100",
              chat.isFavorite && "text-[#6c55dc]",
              "transition-[opacity,color] duration-200 ease-out motion-reduce:transition-none",
            )}
            initial={false}
            animate={{
              x:
                chat.isFavorite &&
                !isHovered &&
                !isFocused &&
                !isOpen
                  ? 28
                  : 0,
            }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : CHAT_ACTION_SPRING
            }
            onClick={(event) => {
              event.stopPropagation();
              onSetChatFavorite({
                chatId: chat.id,
                appId: chat.appId,
                title: chat.title || t("newChat"),
                isFavorite: !chat.isFavorite,
                restoreFocus: event.detail === 0,
              });
            }}
            aria-disabled={isPendingFavorite}
            aria-label={t(
              chat.isFavorite
                ? "removeChatFromFavorites"
                : "addChatToFavorites",
              { title: chat.title || t("newChat") },
            )}
            aria-pressed={chat.isFavorite}
            title={t(
              chat.isFavorite
                ? "removeFromFavorites"
                : "addToFavorites",
            )}
            data-testid={`chat-favorite-button-${chat.id}`}
          >
            <motion.span
              className="flex"
              initial={false}
              animate={
                isConfirmedFavorite &&
                !reducedMotion
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
            modal={false}
            onOpenChange={(open) => {
              setIsDropdownOpen(open);
              if (open) {
                setOpenChatActionsId(chat.id);
              } else if (isOpen) {
                setOpenChatActionsId(null);
              }
            }}
          >
            <DropdownMenuTrigger
              className={buttonVariants({
                variant: "ghost",
                size: "icon",
                className:
                  "pointer-events-none h-7 w-7 translate-x-1 scale-90 opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover/chat-row:pointer-events-auto group-hover/chat-row:translate-x-0 group-hover/chat-row:scale-100 group-hover/chat-row:opacity-100 group-focus-within/chat-row:pointer-events-auto group-focus-within/chat-row:translate-x-0 group-focus-within/chat-row:scale-100 group-focus-within/chat-row:opacity-100 data-popup-open:pointer-events-auto data-popup-open:translate-x-0 data-popup-open:scale-100 data-popup-open:opacity-100 motion-reduce:transition-none",
              })}
              onClick={(e) => e.stopPropagation()}
              aria-label={t("chatActions", {
                title: chat.title || t("newChat"),
              })}
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="space-y-1 p-2"
            >
              <DropdownMenuItem
                onClick={(event) =>
                  onSetChatFavorite({
                    chatId: chat.id,
                    appId: chat.appId,
                    title: chat.title || t("newChat"),
                    isFavorite: !chat.isFavorite,
                    restoreFocus: event.detail === 0,
                  })
                }
                disabled={isPendingFavorite}
                className="px-3 py-2"
              >
                <Star
                  className={cn(
                    "mr-2 h-4 w-4",
                    chat.isFavorite && "fill-current",
                  )}
                />
                <span>
                  {t(
                    chat.isFavorite
                      ? "removeFromFavorites"
                      : "addToFavorites",
                  )}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onRenameChat(chat.id, chat.title || "")
                }
                className="px-3 py-2"
              >
                <Edit3 className="mr-2 h-4 w-4" />
                <span>{t("renameChat")}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  onDeleteChatClick(
                    chat.id,
                    chat.title || t("newChat"),
                  )
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
