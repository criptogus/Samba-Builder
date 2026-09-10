import {
  type LucideIcon,
  Home,
  Settings,
  HelpCircle,
  Store,
  BookOpen,
  Blocks,
  Factory,
} from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useSidebar } from "@/components/ui/sidebar"; // import useSidebar hook
import type { ComponentType } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChatList } from "./ChatList";
import { AppList } from "./AppList";
import { HelpDialog } from "./HelpDialog";
import { helpDialogAtom } from "@/atoms/helpDialogAtom";
import { SettingsList } from "./SettingsList";
import { LibraryList } from "./LibraryList";
import {
  type AppSidebarItemTitle,
  getSelectedSidebarPanel,
  isSidebarItemActive,
  shouldShowSelectedAppChatList,
} from "./app-sidebar-state";
import { useTranslation } from "react-i18next";
import { useServicesHealth } from "@/hooks/useServicesHealth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const itemLabelKey: Record<
  AppSidebarItemTitle,
  | "sidebar.factory"
  | "sidebar.apps"
  | "sidebar.settings"
  | "sidebar.library"
  | "sidebar.templates"
  | "sidebar.plugins"
> = {
  Fábrica: "sidebar.factory",
  Apps: "sidebar.apps",
  Settings: "sidebar.settings",
  Library: "sidebar.library",
  Templates: "sidebar.templates",
  Plugins: "sidebar.plugins",
};

// Menu items.
const items = [
  { title: "Fábrica", to: "/factory", icon: Factory },
  {
    title: "Apps",
    to: "/",
    icon: Home,
  },
  {
    title: "Settings",
    to: "/settings",
    icon: Settings,
  },
  {
    title: "Library",
    to: "/library",
    icon: BookOpen,
  },
  {
    title: "Templates",
    to: "/templates",
    icon: Store,
  },
  {
    title: "Plugins",
    to: "/plugins",
    icon: Blocks,
  },
] satisfies Array<{
  title: AppSidebarItemTitle;
  to: string;
  icon: ComponentType<{ className?: string }>;
}>;

type AppSidebarItemTo = (typeof items)[number]["to"];

function AppSidebarRailButton({
  icon: Icon,
  label,
  isActive = false,
  to,
  onClick,
  onMouseEnter,
}: {
  icon: LucideIcon;
  label: string;
  isExpanded: boolean;
  isActive?: boolean;
  to?: AppSidebarItemTo;
  onClick?: () => void;
  onMouseEnter?: () => void;
}) {
  const className = cn(
    "group/rail-button relative mb-1 flex h-14 items-center justify-center rounded-lg outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    "w-16",
    isActive
      ? "bg-primary/10 after:absolute after:left-0 after:h-5 after:w-0.5 after:rounded-full after:bg-primary"
      : "hover:bg-sidebar-accent active:bg-sidebar-accent",
  );
  const content = (
    <>
      <span
        className={cn(
          "absolute left-1/2 -translate-x-1/2 -translate-y-1/2 transition-[top] duration-200 ease-linear",
          "top-[35%]",
        )}
      >
        <Icon className={cn("size-5", isActive && "text-primary")} />
      </span>
      <span
        className={cn(
          "pointer-events-none absolute bottom-1.5 left-1/2 max-w-[calc(100%-0.5rem)] -translate-x-1/2 truncate text-[10px] leading-3 transition-[opacity,transform] duration-200 ease-linear",
          "translate-y-0 opacity-100",
          isActive ? "font-medium text-primary" : "text-sidebar-foreground/80",
        )}
      >
        {label}
      </span>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        className={className}
        onMouseEnter={onMouseEnter}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      className={className}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {content}
    </button>
  );
}

export function AppSidebar() {
  const { t } = useTranslation("common");
  const { state } = useSidebar();
  const setHelpDialog = useSetAtom(helpDialogAtom);
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);
  const navigate = useNavigate();
  const pathname = useRouterState().location.pathname;
  const selectedItem = getSelectedSidebarPanel({
    hoverState: "no-hover",
    sidebarState: state,
    pathname,
  });
  const showSelectedAppChats = shouldShowSelectedAppChatList({
    selectedPanel: selectedItem,
    selectedAppId,
    pathname,
  });
  const handleViewAllApps = () => {
    setSelectedAppId(null);
    setSelectedChatId(null);
    navigate({ to: "/" });
  };
  const health = useServicesHealth();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="overflow-hidden">
        <div className="flex mt-[calc(var(--layout-title-bar-offset)+0.25rem)]">
          <div className="w-18 shrink-0 px-1">
            <SidebarTrigger className="w-16 text-muted-foreground hover:text-foreground" />
            <SidebarGroup className="p-0 py-2">
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <AppSidebarRailButton
                        icon={item.icon}
                        label={t(itemLabelKey[item.title])}
                        to={item.to}
                        isActive={isSidebarItemActive({
                          title: item.title,
                          pathname,
                        })}
                        isExpanded={state === "expanded"}
                      />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
          {state === "expanded" && (
            <div className="relative h-[calc(100vh-112px)] w-[224px] overflow-hidden border-l border-sidebar-border">
              {selectedItem === "Apps" && !showSelectedAppChats && (
                <AppList show />
              )}
              {showSelectedAppChats && (
                <ChatList
                  show
                  showViewAllAppsButton
                  onViewAllApps={handleViewAllApps}
                />
              )}
              {selectedItem === "Settings" && <SettingsList show />}
              {selectedItem === "Library" && <LibraryList show />}
            </div>
          )}
        </div>
      </SidebarContent>
      <SidebarFooter className="px-1 items-start">
        <SidebarMenu>
          <SidebarMenuItem className="mb-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <div
                      role="status"
                      aria-label={t("sidebar.servicesHealth")}
                      className="group/health flex h-8 w-16 cursor-help items-center justify-center gap-1.5 rounded-md border border-sidebar-border/60 bg-sidebar-accent/40 text-[10px] text-muted-foreground hover:bg-sidebar-accent"
                    />
                  }
                >
                  <span
                    className={cn(
                      "size-2 rounded-full transition-colors",
                      health.cortex
                        ? "bg-emerald-500"
                        : "bg-zinc-400 dark:bg-zinc-600",
                    )}
                  />
                  <span
                    className={cn(
                      "size-2 rounded-full transition-colors",
                      health.hermes
                        ? "bg-emerald-500"
                        : "bg-zinc-400 dark:bg-zinc-600",
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" className="space-y-1 text-xs">
                  <p className="font-semibold text-foreground">
                    {t("sidebar.servicesHealth")}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        health.cortex
                          ? "bg-emerald-500"
                          : "bg-muted-foreground",
                      )}
                    />
                    <span>{t("sidebar.cortexService")}:</span>
                    <strong
                      className={
                        health.cortex
                          ? "text-emerald-500"
                          : "text-muted-foreground"
                      }
                    >
                      {health.cortex
                        ? t("sidebar.serviceOnline")
                        : t("sidebar.serviceOffline")}
                    </strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        health.hermes
                          ? "bg-emerald-500"
                          : "bg-muted-foreground",
                      )}
                    />
                    <span>{t("sidebar.hermesService")}:</span>
                    <strong
                      className={
                        health.hermes
                          ? "text-emerald-500"
                          : "text-muted-foreground"
                      }
                    >
                      {health.hermes
                        ? t("sidebar.serviceOnline")
                        : t("sidebar.serviceOffline")}
                    </strong>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <AppSidebarRailButton
              icon={HelpCircle}
              label={t("sidebar.help")}
              isExpanded={state === "expanded"}
              onClick={() => setHelpDialog({ open: true })}
            />
            <HelpDialog />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
