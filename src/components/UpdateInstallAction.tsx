import { DownloadIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { ipc } from "@/ipc/types";

type InstallPhase =
  | "downloading"
  | "verifying"
  | "extracting"
  | "installing"
  | "done";

/**
 * Botão que baixa e instala a atualização, com progresso.
 *
 * O app baixa, confere o digest publicado, extrai e troca o próprio bundle: ele
 * fecha e reabre sozinho, e o bundle antigo vai para o Lixo (reversível).
 * Quando a instalação automática não se aplica — outra plataforma, modo de
 * desenvolvimento, falha — mostra o motivo e mantém o caminho para a release,
 * em vez de fingir que instalou.
 */
export function UpdateInstallAction({
  version,
  releaseUrl,
  className,
}: {
  version: string | null;
  releaseUrl: string | null;
  className?: string;
}) {
  const { t } = useTranslation("settings");
  const [progress, setProgress] = useState<{
    phase: InstallPhase;
    percent: number;
  } | null>(null);
  const [state, setState] = useState<
    "idle" | "running" | "scheduled" | "problem"
  >("idle");
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    return ipc.events.system.onUpdateInstallProgress((update) => {
      setProgress({
        phase: update.phase as InstallPhase,
        percent: update.percent,
      });
    });
  }, []);

  const phaseLabel = (phase: InstallPhase, percent: number): string => {
    switch (phase) {
      case "downloading":
        return t("general.updateInstallDownloading", { percent });
      case "verifying":
        return t("general.updateInstallVerifying");
      case "extracting":
        return t("general.updateInstallExtracting");
      case "installing":
        return t("general.updateInstallInstalling");
      default:
        return t("general.updateInstallPreparing");
    }
  };

  const handleInstall = async () => {
    setState("running");
    setProblem(null);
    setProgress(null);
    try {
      const result = await ipc.system.installUpdate();
      if (result.status === "scheduled") {
        setState("scheduled");
      } else {
        setState("problem");
        setProblem(result.reason);
      }
    } catch (error) {
      setState("problem");
      setProblem(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="space-y-2">
      <Button
        className={className}
        disabled={state === "running"}
        onClick={() => void handleInstall()}
      >
        {state === "running" ? (
          <>
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            {progress
              ? phaseLabel(progress.phase, progress.percent)
              : t("general.updateInstallPreparing")}
          </>
        ) : (
          <>
            <DownloadIcon className="mr-2 h-4 w-4" />
            {version
              ? t("general.updateInstall", { version })
              : t("general.updateInstallNoVersion")}
          </>
        )}
      </Button>
      {state === "scheduled" && (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {t("general.updateInstallScheduled")}
        </p>
      )}
      {state === "problem" && (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {problem ? `${problem} ` : ""}
          {releaseUrl ? (
            <button
              type="button"
              className="underline"
              onClick={() => void ipc.system.openExternalUrl(releaseUrl)}
            >
              {t("general.updateInstallOpenRelease")}
            </button>
          ) : null}
        </p>
      )}
    </div>
  );
}
