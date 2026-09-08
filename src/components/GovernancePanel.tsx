import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { governanceClient } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import type { GovernanceStatus } from "@/ipc/types/governance";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

const STAGE_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  staging: "Staging",
  production: "Production",
};

function stageLabel(stage: string | null): string {
  if (!stage) return "—";
  return STAGE_LABEL[stage] ?? stage;
}

const ROLE_LABELS: Array<keyof GovernanceStatus["roles"]> = [
  "owner",
  "tech",
  "reviewer",
  "admin",
];

export function GovernancePanel({ appPath }: { appPath: string }) {
  const queryClient = useQueryClient();
  const [actor, setActor] = useState("");
  const [result, setResult] = useState<{
    ok: boolean;
    output: string;
  } | null>(null);

  const statusQuery = useQuery({
    queryKey: queryKeys.governance.status({ appPath }),
    queryFn: () => governanceClient.get({ appPath }),
    enabled: appPath.length > 0,
    staleTime: 0,
  });

  const runMutation = useMutation({
    mutationFn: (action: "submit" | "approve" | "veto") =>
      governanceClient.run({
        appPath,
        action,
        by: actor.trim() || undefined,
      }),
    onSuccess: (data) => {
      setResult({ ok: data.ok, output: data.output });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.governance.status({ appPath }),
      });
    },
    onError: (err) => {
      setResult({
        ok: false,
        output: err instanceof Error ? err.message : String(err),
      });
    },
  });

  if (!appPath) {
    return <p className="text-sm text-muted-foreground">No project path.</p>;
  }

  if (statusQuery.isPending) {
    return <p role="status">Loading governance…</p>;
  }
  if (statusQuery.error) {
    return (
      <div role="alert" className="text-sm text-destructive">
        Could not load governance.{" "}
        <Button variant="outline" size="sm" onClick={() => void statusQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const status = statusQuery.data;
  const isGoverned = status.mode === "governed";
  const busy = runMutation.isPending;

  return (
    <section
      aria-label="Governance"
      className="mt-6 rounded-xl border border-border bg-card p-5"
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Governança</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Samba governance gate (single vs governed).
          </p>
        </div>
        <ModeBadge governed={isGoverned} />
      </div>

      {!status.gateAvailable ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {status.gateError ?? "Governance gate not available."}
        </p>
      ) : (
        <>
          <GovernanceFacts status={status} />

          {isGoverned && (
            <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  aria-label="Acting as"
                  placeholder={
                    status.actingAs ? `Acting as ${status.actingAs}` : "Acting as (email)"
                  }
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                  className="h-8 w-64 text-xs"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy || status.stage !== "draft"}
                    onClick={() => runMutation.mutate("submit")}
                  >
                    Submit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || status.stage !== "in_review"}
                    onClick={() => runMutation.mutate("approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={
                      busy ||
                      (status.stage !== "in_review" && status.stage !== "approved")
                    }
                    onClick={() => runMutation.mutate("veto")}
                  >
                    Veto
                  </Button>
                </div>
              </div>
              {busy && <p className="mt-2 text-xs text-muted-foreground">Running gate…</p>}
              {result && (
                <p
                  role={result.ok ? "status" : "alert"}
                  className={cn(
                    "mt-2 whitespace-pre-wrap text-xs",
                    result.ok ? "text-foreground" : "text-destructive",
                  )}
                >
                  {result.output}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ModeBadge({ governed }: { governed: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        governed
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground",
      )}
    >
      {governed ? "governed" : "single"}
    </span>
  );
}

function GovernanceFacts({ status }: { status: GovernanceStatus }) {
  const cycleLabel = isGovernedStage(status)
    ? `${stageLabel(status.stage)} · ${status.vetos} veto${status.vetos === 1 ? "" : "s"}`
    : "No approval cycle (owner is the dev)";
  return (
    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
      <Fact label="Cycle" value={cycleLabel} />
      <Fact label="Last audit" value={auditLabel(status)} />
      {isGovernedStage(status) && (
        <Fact label="Acting as" value={status.actingAs || "not resolved"} />
      )}
      {ROLE_LABELS.some((r) => status.roles[r].length > 0) && (
        <div>
          <dt className="mb-1 text-xs text-muted-foreground">Roles</dt>
          <dd className="space-y-0.5 text-xs">
            {ROLE_LABELS.filter((r) => status.roles[r].length > 0).map((r) => (
              <p key={r} className="truncate">
                <span className="font-medium">{r}:</span>{" "}
                <span className="text-muted-foreground">
                  {status.roles[r].join(", ")}
                </span>
              </p>
            ))}
          </dd>
        </div>
      )}
    </dl>
  );
}

function isGovernedStage(status: GovernanceStatus): boolean {
  return status.mode === "governed";
}

function auditLabel(status: GovernanceStatus): string {
  if (!status.lastAudit) return "No audit trail yet";
  const ev = status.lastAudit.event || "event";
  const by = status.lastAudit.by ? ` · by ${status.lastAudit.by}` : "";
  const ts = status.lastAudit.ts ? ` · ${status.lastAudit.ts.slice(0, 19).replace("T", " ")}` : "";
  return `${ev}${by}${ts}`;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-0.5 text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm">{value}</dd>
    </div>
  );
}
