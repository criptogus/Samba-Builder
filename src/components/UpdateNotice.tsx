import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";

const hint = "text-[13px] leading-relaxed text-muted-foreground";

/**
 * Aviso de nova versão.
 *
 * O app não se atualiza sozinho — os builds não são assinados, então o sistema
 * operacional não permitiria instalar em silêncio. A checagem é informativa:
 * mostra a versão publicada e abre o download. Só roda quando o usuário mantém
 * "avisar sobre novas versões" ligado; desligado, resta a explicação do toggle.
 */
export function UpdateNotice() {
  const { settings } = useSettings();
  const { t } = useTranslation("settings");
  const enabled = settings?.enableAutoUpdate === true;

  const { data, isFetching, refetch } = useQuery({
    queryKey: queryKeys.updates.status(),
    queryFn: () => ipc.system.checkForUpdates(),
    enabled,
    retry: false,
    staleTime: 60 * 60 * 1000,
  });

  const description = (
    <p className={hint}>{t("general.autoUpdateDescription")}</p>
  );

  if (!enabled) {
    return description;
  }

  if (isFetching && !data) {
    return (
      <div className="space-y-1.5">
        {description}
        <p className={hint}>{t("general.updateChecking")}</p>
      </div>
    );
  }

  if (data?.status === "update-available") {
    return (
      <div className="space-y-1.5">
        <p className="text-[13px] font-medium">
          {t("general.updateAvailable", { version: data.latestVersion })}
        </p>
        {description}
        <Button
          size="sm"
          onClick={() => {
            if (data.releaseUrl) {
              void ipc.system.openExternalUrl(data.releaseUrl);
            }
          }}
        >
          {t("general.updateDownload")}
        </Button>
      </div>
    );
  }

  if (data?.status === "up-to-date") {
    return (
      <div className="space-y-1.5">
        {description}
        <p className={hint}>
          {t("general.updateUpToDate", { version: data.currentVersion })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {description}
      <p className={hint}>
        {t("general.updateCheckFailed")}{" "}
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0"
          onClick={() => {
            void refetch();
          }}
        >
          {t("general.updateRetry")}
        </Button>
      </p>
    </div>
  );
}
