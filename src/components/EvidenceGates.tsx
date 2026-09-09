import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  evidenceBlockers,
  evidenceItemFor,
  gateLabels,
  requiredGates,
  riskProfileLabels,
  upsertEvidenceItem,
  type EvidenceGateId,
  type EvidenceItem,
  type EvidenceStatus,
} from "@/delivery/evidence";
import type { DeliveryPlan } from "@/delivery/model";
import { ShieldCheck } from "lucide-react";

const statusBadge: Record<
  EvidenceStatus,
  {
    label: string;
    variant: "default" | "destructive" | "secondary" | "outline";
  }
> = {
  passed: { label: "Passou", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
  not_run: { label: "Não executado", variant: "secondary" },
  blocked: { label: "Bloqueado", variant: "destructive" },
};

/**
 * Samba Delivery Standard — gates de evidência por perfil de risco.
 * Cada gate obrigatório do perfil precisa de um item com status "passed"
 * (o que foi verificado, como e o resultado observado) antes da aprovação.
 * "Parece pronto" nunca é critério de conclusão.
 */
export function EvidenceGates({
  plan,
  onChange,
}: {
  plan: DeliveryPlan;
  onChange: (next: DeliveryPlan) => void;
}) {
  const profile = plan.engineeringPolicy?.profile;
  if (!profile) return null;

  const gates = requiredGates(profile);
  const blockers = evidenceBlockers(plan.evidenceItems, profile);
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Gates de evidência</h4>
        </div>
        <Badge variant="outline">{riskProfileLabels[profile]}</Badge>
      </div>
      {blockers.length > 0 && (
        <ul className="space-y-1 rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
          {blockers.map((b) => (
            <li key={b}>
              • {b.replace("Evidência (perfil", "Falta evidência (perfil")}
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        {gates.map((gate) => (
          <EvidenceGateRow
            key={gate}
            gate={gate}
            item={evidenceItemFor(plan.evidenceItems, gate)}
            onSave={(item) =>
              onChange({
                ...plan,
                evidenceItems: upsertEvidenceItem(plan.evidenceItems, item),
              })
            }
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Registre verificações realmente executadas e seus resultados observados
        — comando, versão e artefatos tornam a evidência reprodutível. Este
        formulário não executa testes nem substitui a aprovação do cliente.
      </p>
    </div>
  );
}

function EvidenceGateRow({
  gate,
  item,
  onSave,
}: {
  gate: EvidenceGateId;
  item?: EvidenceItem;
  onSave: (item: EvidenceItem) => void;
}) {
  const [status, setStatus] = useState<EvidenceStatus>(
    item?.status ?? "passed",
  );
  const [summary, setSummary] = useState(item?.summary ?? "");
  const [command, setCommand] = useState(item?.command ?? "");
  const badge = statusBadge[status];
  const saved =
    item &&
    item.status === status &&
    item.summary === summary &&
    (item.command ?? "") === command;

  return (
    <div className="space-y-1.5 rounded-md border p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{gateLabels[gate]}</span>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      <Textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="O que foi verificado e o resultado observado"
        className="min-h-[44px] text-xs"
      />
      <div className="flex gap-2">
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Comando executado (ex.: npm run test:unit)"
          className="h-8 text-xs"
        />
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as EvidenceStatus)}
        >
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="passed">Passou</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
            <SelectItem value="not_run">Não executado</SelectItem>
            <SelectItem value="blocked">Bloqueado</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="h-8 text-xs"
          disabled={saved || !summary.trim()}
          onClick={() =>
            onSave({
              gate,
              status,
              summary: summary.trim(),
              command: command.trim() || undefined,
              by: "human",
              executedAt: new Date().toISOString(),
            })
          }
        >
          Registrar
        </Button>
      </div>
    </div>
  );
}
