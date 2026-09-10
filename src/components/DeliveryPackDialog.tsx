import { useMemo, useState } from "react";
import {
  buildDeliveryPack,
  deliveryPackFileName,
  renderDeliveryPackMarkdown,
} from "@/delivery/delivery_pack";
import type { DeliveryPlan } from "@/delivery/model";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showError, showSuccess } from "@/lib/toast";
import { Check, Copy, Download, ShieldAlert } from "lucide-react";

interface DeliveryPackApprovalInput {
  revision: number;
  commit: string;
  reviewer: string;
  note: string;
  createdAt: Date;
}

interface DeliveryPackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName: string;
  plan: DeliveryPlan;
  approvals?: DeliveryPackApprovalInput[];
}

/**
 * "Mostre o que foi verificado, o que não foi verificado e por quê."
 *
 * Exporta o pacote de entrega da versão atual: requisito, tarefas, evidência por
 * gate, verificações registradas, aprovação, bloqueios e decisões. O documento
 * é honesto por construção — o que falta aparece como falta.
 */
export function DeliveryPackDialog({
  open,
  onOpenChange,
  appName,
  plan,
  approvals,
}: DeliveryPackDialogProps) {
  const [copied, setCopied] = useState(false);

  const pack = useMemo(
    () => buildDeliveryPack({ app: appName, plan, approvals }),
    [appName, plan, approvals],
  );
  const markdown = useMemo(() => renderDeliveryPackMarkdown(pack), [pack]);

  const blockerCount =
    pack.blockers.delivery.length + pack.blockers.evidence.length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      showSuccess("Pacote copiado para a área de transferência.");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showError(error);
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([markdown], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = deliveryPackFileName(appName, pack.generatedAt);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showSuccess("Pacote de entrega exportado.");
    } catch (error) {
      showError(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pacote de entrega</DialogTitle>
          <DialogDescription>
            A prova desta versão: o que foi combinado, o que foi verificado e o
            que ainda falta. Exporte e entregue junto com o projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{pack.risk.label}</Badge>
          <Badge variant="secondary">
            {pack.evidence.passedCount}/{pack.evidence.requiredCount} gates
            verificados
          </Badge>
          <Badge variant="secondary">
            {pack.tasks.verifiedCount}/{pack.tasks.total} tarefas verificadas
          </Badge>
          {blockerCount > 0 ? (
            <Badge
              variant="outline"
              className="gap-1 border-amber-500/50 text-amber-700 dark:text-amber-300"
            >
              <ShieldAlert size={12} />
              {blockerCount} pendência(s)
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
            >
              Sem pendências
            </Badge>
          )}
        </div>

        <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed whitespace-pre-wrap">
          {markdown}
        </pre>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button onClick={handleDownload}>
            <Download size={15} />
            Baixar .md
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
