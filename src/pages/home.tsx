import { ProductCoachButton } from "@/components/ProductCoachButton";
import { appendProductBrief } from "@/product_coach/model";
import { appendMeetingBriefing } from "@/shared/meeting_briefing";
import { MeetingBriefingButton } from "@/components/MeetingBriefingButton";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import {
  attachmentsAtom,
  hasManuallySelectedChatModeAtom,
  homeChatInputValueAtom,
  homeSelectedAppAtom,
} from "../atoms/chatAtoms";
import { useSettings } from "@/hooks/useSettings";
import { useCallback, useEffect, useMemo } from "react";
import { HomeChatInput } from "@/components/chat/HomeChatInput";
import { usePostHog } from "posthog-js/react";
import { PrivacyBanner } from "@/components/TelemetryBanner";

import { ImportAppButton } from "@/components/ImportAppButton";
import { DeliveryWorkspace } from "@/components/DeliveryWorkspace";

import type { FileAttachment } from "@/ipc/types";
import type { ListedApp } from "@/ipc/types/app";
import { hasSambaProKey, type ChatMode } from "@/lib/schemas";
import {
  FREE_PRO_MODEL_FALLBACK_CHAT_MODE,
  isFreeProBuildModeCombination,
} from "@/lib/freeProModel";
import { useLanguageModelProviders } from "@/hooks/useLanguageModelProviders";
import { Zap } from "lucide-react";
import {
  useFirstPromptSaga,
  useFirstPromptSend,
} from "@/first_prompt/FirstPromptProvider";
import { getHomeDefaultChatMode } from "@/lib/homeChatMode";

// Adding an export for attachments
export interface HomeSubmitOptions {
  attachments?: FileAttachment[];
  selectedApp?: ListedApp;
}

export default function HomePage() {
  const { t } = useTranslation("home");
  const [inputValue, setInputValue] = useAtom(homeChatInputValueAtom);
  const selectedApp = useAtomValue(homeSelectedAppAtom);
  const attachments = useAtomValue(attachmentsAtom);
  const firstPromptSaga = useFirstPromptSaga();
  const sendFirstPrompt = useFirstPromptSend();
  const navigate = useNavigate();
  const search = useSearch({ from: "/" });
  const { settings, envVars, loading: isSettingsLoading } = useSettings();
  const { isAnyProviderSetup, isLoading: isLoadingLanguageModelProviders } =
    useLanguageModelProviders();
  const hasSambaProApiKey = settings ? hasSambaProKey(settings) : false;
  const hasConfiguredAiProvider =
    !isLoadingLanguageModelProviders && isAnyProviderSetup();
  const homeInitialChatMode = useMemo<ChatMode | undefined>(() => {
    if (!settings) {
      return undefined;
    }

    return getHomeDefaultChatMode(settings, envVars);
  }, [envVars, settings]);

  const posthog = usePostHog();

  // Get the appId from search params
  const appId = search.appId ? Number(search.appId) : null;

  // Redirect to app details page if appId is present. Use `replace` so the
  // intermediate `/?appId=…` entry doesn't sit in history and trap the back
  // button on app-details in a redirect loop.
  useEffect(() => {
    if (appId) {
      navigate({ to: "/app-details", search: { appId }, replace: true });
    }
  }, [appId, navigate]);

  const hasManuallySelectedChatMode = useAtomValue(
    hasManuallySelectedChatModeAtom,
  );

  // Honor a manually picked mode (e.g. "plan") on submit; otherwise fall back
  // to the effective default so it still tracks provider/quota state. Apply the
  // Free Pro fallback for an invalid build-mode + free-pro-model combination.
  const homeSubmitChatMode = useMemo<ChatMode | undefined>(() => {
    const selected =
      hasManuallySelectedChatMode && settings?.selectedChatMode
        ? settings.selectedChatMode
        : homeInitialChatMode;
    if (
      settings &&
      isFreeProBuildModeCombination(settings.selectedModel, selected)
    ) {
      return FREE_PRO_MODEL_FALLBACK_CHAT_MODE;
    }
    return selected;
  }, [settings, homeInitialChatMode, hasManuallySelectedChatMode]);

  const handleSubmit = useCallback(
    (options?: HomeSubmitOptions) => {
      const submittedAttachments = options?.attachments ?? [];
      if (!inputValue.trim() && submittedAttachments.length === 0) return false;
      return sendFirstPrompt({
        type: "SUBMIT",
        payload: {
          prompt: inputValue,
          attachments: submittedAttachments,
          selectedApp: options?.selectedApp,
          chatMode: homeSubmitChatMode,
          isChatModeExplicit: hasManuallySelectedChatMode,
        },
      });
    },
    [
      hasManuallySelectedChatMode,
      homeSubmitChatMode,
      inputValue,
      sendFirstPrompt,
    ],
  );

  const isLoading = [
    "creating",
    "postCreate",
    "dispatching",
    "navigating",
  ].includes(firstPromptSaga.phase);
  const isCheckingProviders = firstPromptSaga.phase === "checkingProviders";

  // Loading overlay for app creation
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center max-w-3xl m-auto p-8">
        <div className="w-full flex flex-col items-center">
          {/* Loading Spinner */}
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute top-0 left-0 w-full h-full border-8 border-gray-200 dark:border-gray-700 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-8 border-t-primary rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">
            {firstPromptSaga.isExistingAppSubmission
              ? t("startingChat")
              : t("buildingApp")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
            {firstPromptSaga.isExistingAppSubmission ? (
              t("creatingNewChat")
            ) : (
              <>
                {t("settingUp")} <br />
                {t("mightTakeMoment")}
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  // Main Home Page Content
  return (
    <div className="flex min-h-full w-full flex-col pb-16">
      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-6 py-8 sm:px-9 sm:py-10">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,25rem),1fr))] items-start gap-8">
          <DeliveryWorkspace />
          <section
            id="project-intake"
            aria-labelledby="project-intake-title"
            className="scroll-mt-12 rounded-xl border border-border bg-card p-5 sm:p-6"
          >
            <div className="mb-4 text-left">
              <p className="mb-3 text-[11px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                {t("delivery.intakeLabel")}
              </p>
              <h2
                id="project-intake-title"
                className="max-w-xl text-2xl font-semibold tracking-tight text-foreground"
              >
                {t("delivery.intakeTitle")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                {t("delivery.intakeSubtitle")}
              </p>
            </div>
            <HomeChatInput
              onSubmit={handleSubmit}
              disabled={isCheckingProviders}
            />

            {!isSettingsLoading &&
              !isLoadingLanguageModelProviders &&
              !hasSambaProApiKey && (
                <div className="-mt-2 flex justify-end px-4">
                  <button
                    type="button"
                    onClick={() => {
                      posthog.capture("home:setup-pill:click");
                      sendFirstPrompt({
                        type: "ARM_FOR_SETUP",
                        payload: {
                          prompt: inputValue,
                          attachments,
                          selectedApp: selectedApp ?? undefined,
                          chatMode: homeSubmitChatMode,
                          isChatModeExplicit: hasManuallySelectedChatMode,
                        },
                      });
                    }}
                    className={
                      hasConfiguredAiProvider
                        ? "flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground hover:underline"
                        : "flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 hover:underline"
                    }
                  >
                    <Zap aria-hidden="true" className="size-3.5" />
                    {hasConfiguredAiProvider
                      ? t("delivery.manageAiSetup")
                      : t("delivery.connectAiToBuild")}
                  </button>
                </div>
              )}

            <div className="mt-5 divide-y divide-border border-t border-border">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-4 py-3 [&_button]:justify-start [&_button]:whitespace-normal">
                <ProductCoachButton
                  key={selectedApp?.id ?? "home"}
                  draftKey={selectedApp ? `app:${selectedApp.id}` : "home"}
                  idea={inputValue}
                  onPrepared={(brief) =>
                    setInputValue((current) =>
                      appendProductBrief(current, brief),
                    )
                  }
                />
                <p className="max-w-60 text-xs leading-5 text-muted-foreground">
                  {t("workspace.planHint")}
                </p>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-4 py-3 [&_button]:justify-start [&_button]:whitespace-normal">
                <MeetingBriefingButton
                  onPrepared={(prompt) =>
                    setInputValue(appendMeetingBriefing(inputValue, prompt))
                  }
                />
                <p className="max-w-60 text-xs leading-5 text-muted-foreground">
                  {t("workspace.meetingHint")}
                </p>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-4 py-3 [&_button]:justify-start [&_button]:whitespace-normal">
                <ImportAppButton
                  className="justify-start px-0 pb-0"
                  variant="ghost"
                  size="sm"
                />
                <p className="max-w-60 text-xs leading-5 text-muted-foreground">
                  {t("workspace.importHint")}
                </p>
              </div>
            </div>
          </section>
        </div>
        <PrivacyBanner />
      </div>
    </div>
  );
}
