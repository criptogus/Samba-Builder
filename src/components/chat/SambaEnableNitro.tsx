import React from "react";
import { Server } from "lucide-react";
import {
  SambaCard,
  SambaCardHeader,
  SambaBadge,
  SambaStateIndicator,
} from "./SambaCardPrimitives";
import { CustomTagState } from "./stateTypes";

interface SambaEnableNitroProps {
  state?: CustomTagState;
}

export const SambaEnableNitro: React.FC<SambaEnableNitroProps> = ({
  state,
}) => {
  const isPending = state === "pending";
  const isAborted = state === "aborted";
  const headline = isPending
    ? "Adding Nitro server layer"
    : isAborted
      ? "Nitro server layer setup aborted"
      : "Added Nitro server layer";
  return (
    <SambaCard accentColor="emerald" state={state}>
      <SambaCardHeader icon={<Server size={15} />} accentColor="emerald">
        <SambaBadge color="emerald">Server layer</SambaBadge>
        <span className="text-sm font-medium text-foreground">{headline}</span>
        {state && (
          <SambaStateIndicator state={state} abortedLabel="Did not finish" />
        )}
      </SambaCardHeader>
      {!isPending && !isAborted && (
        <div className="px-3 pb-3">
          <p className="text-xs text-muted-foreground leading-snug">
            API routes can now live under{" "}
            <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-muted">
              server/routes/api/
            </code>
          </p>
        </div>
      )}
    </SambaCard>
  );
};
