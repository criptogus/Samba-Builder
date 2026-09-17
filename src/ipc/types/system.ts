import { z } from "zod";
import {
  defineContract,
  defineEvent,
  createClient,
  createEventClient,
} from "../contracts/core";
import { AppSizeTelemetrySchema } from "../../shared/app_size_telemetry";

// =============================================================================
// System Schemas
// =============================================================================

/** Resultado da checagem de nova versão. Informativo: a instalação é manual. */
export const ReleaseCheckResultSchema = z.object({
  status: z.enum(["update-available", "up-to-date", "unavailable"]),
  currentVersion: z.string(),
  latestVersion: z.string().nullable(),
  releaseUrl: z.string().nullable(),
  assetName: z.string().nullable(),
  reason: z.string().nullable(),
});

/** Progresso da instalação de uma atualização (etapas iguais às do Node gerenciado). */
export const UpdateInstallProgressSchema = z.object({
  phase: z.enum([
    "downloading",
    "verifying",
    "extracting",
    "installing",
    "done",
  ]),
  percent: z.number().min(0).max(100),
});

export type UpdateInstallProgress = z.infer<typeof UpdateInstallProgressSchema>;

export const InstallUpdateResultSchema = z.object({
  status: z.enum(["scheduled", "unsupported", "failed"]),
  reason: z.string().nullable(),
});

export type InstallUpdateResult = z.infer<typeof InstallUpdateResultSchema>;

export const NodeSystemInfoSchema = z.object({
  nodeVersion: z.string().nullable(),
  pnpmVersion: z.string().nullable(),
  nodeDownloadUrl: z.string(),
  source: z.enum(["system", "managed", "custom"]).nullable(),
  nodePath: z.string().nullable(),
  managedNodeInstalled: z.boolean(),
  managedNodeVersion: z.string().nullable(),
  systemNodeTooOld: z.boolean(),
  managedNodeSupported: z.boolean(),
});

export type NodeSystemInfo = z.infer<typeof NodeSystemInfoSchema>;

export const InstallPnpmResultSchema = z.object({
  pnpmVersion: z.string(),
});

export type InstallPnpmResult = z.infer<typeof InstallPnpmResultSchema>;

export const InstallManagedNodeResultSchema = z.object({
  nodeVersion: z.string(),
});

export type InstallManagedNodeResult = z.infer<
  typeof InstallManagedNodeResultSchema
>;

export const ManagedNodeInstallProgressSchema = z.object({
  phase: z.enum([
    "downloading",
    "verifying",
    "extracting",
    "installing",
    "done",
  ]),
  percent: z.number().min(0).max(100),
});

export type ManagedNodeInstallProgress = z.infer<
  typeof ManagedNodeInstallProgressSchema
>;

export const SystemDebugInfoSchema = z.object({
  nodeVersion: z.string().nullable(),
  pnpmVersion: z.string().nullable(),
  nodePath: z.string().nullable(),
  telemetryId: z.string(),
  telemetryConsent: z.string(),
  telemetryUrl: z.string(),
  sambaVersion: z.string(),
  platform: z.string(),
  architecture: z.string(),
  logs: z.string(),
  /** Auto-updater failure details (last in-process error + Squirrel log tail on Windows). Null if none. */
  updaterLogs: z.string().nullable(),
  selectedLanguageModel: z.string(),
});

export type SystemDebugInfo = z.infer<typeof SystemDebugInfoSchema>;

export const SelectNodeFolderResultSchema = z.object({
  path: z.string().nullable(),
  canceled: z.boolean(),
  selectedPath: z.string().nullable(),
});

export type SelectNodeFolderResult = z.infer<
  typeof SelectNodeFolderResultSchema
>;

export const SelectAppFolderResultSchema = z.object({
  path: z.string().nullable(),
  name: z.string().nullable(),
});

export const SelectCustomAppsFolderResultSchema = z.object({
  path: z.string().nullable(),
  canceled: z.boolean(),
});

export const GetCustomAppsFolderResultSchema = z.object({
  path: z.string(),
  isPathAvailable: z.boolean(),
  isPathDefault: z.boolean(),
});

export const DoesReleaseNoteExistParamsSchema = z.object({
  version: z.string(),
});

export type DoesReleaseNoteExistParams = z.infer<
  typeof DoesReleaseNoteExistParamsSchema
>;

export const DoesReleaseNoteExistResultSchema = z.object({
  exists: z.boolean(),
  url: z.string().optional(),
});

export const UserBudgetInfoSchema = z
  .object({
    usedCredits: z.number(),
    totalCredits: z.number(),
    budgetResetDate: z.date(),
    redactedUserId: z.string(),
    isTrial: z.boolean(),
  })
  .nullable();

export type UserBudgetInfo = z.infer<typeof UserBudgetInfoSchema>;

export const SubscriptionStatusSchema = z
  .object({
    alert: z
      .enum(["subscription_ending", "payment_past_due", "subscription_paused"])
      .nullable(),
    effectiveAt: z.string().datetime().nullable(),
    actionUrl: z.string().url().nullable(),
  })
  .strict()
  .superRefine((status, context) => {
    if (status.alert === null) {
      if (status.effectiveAt !== null || status.actionUrl !== null) {
        context.addIssue({
          code: "custom",
          message: "A healthy subscription status cannot include alert data",
        });
      }
      return;
    }
    if (status.actionUrl === null) {
      context.addIssue({
        code: "custom",
        path: ["actionUrl"],
        message: "Billing alerts require an action URL",
      });
    }
    if (status.alert === "subscription_ending" && status.effectiveAt === null) {
      context.addIssue({
        code: "custom",
        path: ["effectiveAt"],
        message: "Ending subscriptions require an effective date",
      });
    }
  });

export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const TelemetryEventPayloadSchema = z.object({
  eventName: z.string(),
  properties: z.record(z.string(), z.any()).optional(),
});

export type TelemetryEventPayload = z.infer<typeof TelemetryEventPayloadSchema>;

export const ForceCloseDetectedPayloadSchema = z.object({
  performanceData: z
    .object({
      timestamp: z.number(),
      memoryUsageMB: z.number(),
      cpuUsagePercent: z.number().optional(),
      systemMemoryUsageMB: z.number().optional(),
      systemMemoryTotalMB: z.number().optional(),
      systemCpuPercent: z.number().optional(),
    })
    .optional(),
  // Chat that was streaming at crash time, captured in the crash sentinel.
  // Present only if a stream ran this session; enables one-click upload.
  activeChatId: z.number().optional(),
});

/**
 * Failures takeScreenshot can raise. The renderer matches on these to bucket
 * capture failures for telemetry, so both sides move together instead of
 * drifting apart.
 */
export const SCREENSHOT_ERRORS = {
  noFocusedWindow: "No focused window to capture",
  emptyImage: "Failed to capture screenshot",
} as const;

export const NativeThemeStateSchema = z.object({
  shouldUseDarkColors: z.boolean(),
});

export type NativeThemeState = z.infer<typeof NativeThemeStateSchema>;

// =============================================================================
// System Contracts
// =============================================================================

/** Estado da última verificação de atualização (ver `src/main/auto_update_status.ts`). */
export const AutoUpdateStatusSchema = z.object({
  enabled: z.boolean(),
  phase: z.enum([
    "disabled",
    "checking",
    "up-to-date",
    "update-available",
    "downloading",
    "downloaded",
    "error",
  ]),
  lastCheckedAt: z.string().nullable(),
  version: z.string().nullable(),
  message: z.string().nullable(),
});
export type AutoUpdateStatusSnapshot = z.infer<typeof AutoUpdateStatusSchema>;

export const systemContracts = {
  // Window controls
  minimizeWindow: defineContract({
    channel: "window:minimize",
    input: z.void(),
    output: z.void(),
  }),

  maximizeWindow: defineContract({
    channel: "window:maximize",
    input: z.void(),
    output: z.void(),
  }),

  closeWindow: defineContract({
    channel: "window:close",
    input: z.void(),
    output: z.void(),
  }),

  // restore focus to main window
  focusWindow: defineContract({
    channel: "window:focus",
    input: z.void(),
    output: z.void(),
  }),

  // Platform info
  getSystemPlatform: defineContract({
    channel: "get-system-platform",
    input: z.void(),
    output: z.string(),
  }),

  getNativeThemeState: defineContract({
    channel: "native-theme:get-state",
    input: z.void(),
    output: NativeThemeStateSchema,
  }),

  getInitialLoadTelemetryContext: defineContract({
    channel: "get-initial-load-telemetry-context",
    input: z.void(),
    output: z.object({
      isFirstSession: z.boolean(),
      // Absent when the previous session never measured an app.
      previousSessionAppSize: AppSizeTelemetrySchema.nullish(),
    }),
  }),

  getSystemDebugInfo: defineContract({
    channel: "get-system-debug-info",
    input: z.void(),
    output: SystemDebugInfoSchema,
  }),

  getAppVersion: defineContract({
    channel: "get-app-version",
    input: z.void(),
    output: z.object({ version: z.string() }),
  }),

  getUpdateStatus: defineContract({
    channel: "get-update-status",
    input: z.void(),
    output: AutoUpdateStatusSchema,
  }),

  // Node.js
  getNodejsStatus: defineContract({
    channel: "nodejs-status",
    input: z.void(),
    output: NodeSystemInfoSchema,
  }),

  installPnpm: defineContract({
    channel: "install-pnpm",
    input: z.void(),
    output: InstallPnpmResultSchema,
  }),

  installManagedNode: defineContract({
    channel: "install-managed-node",
    input: z.void(),
    output: InstallManagedNodeResultSchema,
  }),

  cancelManagedNodeInstall: defineContract({
    channel: "cancel-managed-node-install",
    input: z.void(),
    output: z.void(),
  }),

  removeManagedNode: defineContract({
    channel: "remove-managed-node",
    input: z.void(),
    output: z.void(),
  }),

  selectNodeFolder: defineContract({
    channel: "select-node-folder",
    input: z.void(),
    output: SelectNodeFolderResultSchema,
  }),

  getNodePath: defineContract({
    channel: "get-node-path",
    input: z.void(),
    output: z.string().nullable(),
  }),

  // File/folder selection
  selectAppFolder: defineContract({
    channel: "select-app-folder",
    input: z.void(),
    output: SelectAppFolderResultSchema,
  }),

  // Custom apps folder
  getCustomAppsFolder: defineContract({
    channel: "get-custom-apps-folder",
    input: z.void(),
    output: GetCustomAppsFolderResultSchema,
  }),

  selectCustomAppsFolder: defineContract({
    channel: "select-custom-apps-folder",
    input: z.void(),
    output: SelectCustomAppsFolderResultSchema,
  }),

  setCustomAppsFolder: defineContract({
    channel: "set-custom-apps-folder",
    input: z.string().nullable(),
    output: z.void(),
  }),

  // External
  openExternalUrl: defineContract({
    channel: "open-external-url",
    input: z.string(),
    output: z.void(),
  }),

  showItemInFolder: defineContract({
    channel: "show-item-in-folder",
    input: z.string(),
    output: z.void(),
  }),

  openFilePath: defineContract({
    channel: "open-file-path",
    input: z.string(),
    output: z.void(),
  }),

  // Session
  clearSessionData: defineContract({
    channel: "clear-session-data",
    input: z.void(),
    output: z.void(),
  }),

  resetAll: defineContract({
    channel: "reset-all",
    input: z.void(),
    output: z.void(),
  }),

  reloadEnvPath: defineContract({
    channel: "reload-env-path",
    input: z.void(),
    output: z.void(),
  }),

  // Release notes
  doesReleaseNoteExist: defineContract({
    channel: "does-release-note-exist",
    input: DoesReleaseNoteExistParamsSchema,
    output: DoesReleaseNoteExistResultSchema,
  }),

  // Budget
  getUserBudget: defineContract({
    channel: "get-user-budget",
    input: z.void(),
    output: UserBudgetInfoSchema,
  }),

  // Upload
  uploadToSignedUrl: defineContract({
    channel: "upload-to-signed-url",
    input: z.object({
      url: z.string(),
      contentType: z.string(),
      data: z.any(),
    }),
    output: z.void(),
  }),

  // Screenshot
  takeScreenshot: defineContract({
    channel: "take-screenshot",
    input: z.void(),
    output: z.void(),
  }),

  // Restart
  restartSamba: defineContract({
    channel: "restart-samba",
    input: z.void(),
    output: z.void(),
  }),

  /**
   * Checa se há versão mais nova publicada neste repositório.
   * Roda no processo principal (o token do GitHub do usuário não vai ao renderer)
   * e é informativo: o app avisa e abre o download, não instala sozinho.
   */
  checkForUpdates: defineContract({
    channel: "check-for-updates",
    input: z.void(),
    output: ReleaseCheckResultSchema,
  }),

  /**
   * Baixa a versão nova, confere o digest publicado, extrai e troca o bundle:
   * o app fecha e reabre sozinho. Só no macOS — fora dele responde
   * `unsupported` com o motivo, e a UI oferece a página da release.
   */
  installUpdate: defineContract({
    channel: "install-update",
    input: z.void(),
    output: InstallUpdateResultSchema,
  }),
} as const;

// =============================================================================
// System Event Contracts
// =============================================================================

export const systemEvents = {
  nativeThemeUpdated: defineEvent({
    channel: "native-theme:updated",
    payload: NativeThemeStateSchema,
  }),

  telemetryEvent: defineEvent({
    channel: "telemetry:event",
    payload: TelemetryEventPayloadSchema,
  }),

  forceCloseDetected: defineEvent({
    channel: "force-close-detected",
    payload: ForceCloseDetectedPayloadSchema,
  }),

  managedNodeInstallProgress: defineEvent({
    channel: "managed-node:install-progress",
    payload: ManagedNodeInstallProgressSchema,
  }),

  /** A verificação de atualização mudou de estado (main → renderer). */
  autoUpdateStatus: defineEvent({
    channel: "auto-update:status",
    payload: AutoUpdateStatusSchema,
  }),

  updateInstallProgress: defineEvent({
    channel: "update:install-progress",
    payload: UpdateInstallProgressSchema,
  }),
} as const;

// =============================================================================
// System Client
// =============================================================================

export const systemClient = createClient(systemContracts);
export const systemEventClient = createEventClient(systemEvents);
