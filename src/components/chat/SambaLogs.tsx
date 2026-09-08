import type React from "react";
import type { ReactNode } from "react";
import { useState } from "react";
import { FileText } from "lucide-react";
import { CodeHighlight } from "./CodeHighlight";
import { CustomTagState } from "./stateTypes";
import {
  SambaCard,
  SambaCardHeader,
  SambaBadge,
  SambaExpandIcon,
  SambaStateIndicator,
  SambaCardContent,
} from "./SambaCardPrimitives";

interface SambaLogsProps {
  children?: ReactNode;
  node?: any;
}

export const SambaLogs: React.FC<SambaLogsProps> = ({ children, node }) => {
  const [isContentVisible, setIsContentVisible] = useState(false);

  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";
  const aborted = state === "aborted";

  const logCount = node?.properties?.count || "";
  const hasResults = !!logCount;

  const logType = node?.properties?.type || "all";
  const logLevel = node?.properties?.level || "all";
  const filters: string[] = [];
  if (logType !== "all") filters.push(`type: ${logType}`);
  if (logLevel !== "all") filters.push(`level: ${logLevel}`);
  const filterDesc = filters.length > 0 ? ` (${filters.join(", ")})` : "";

  const displayText = `Reading ${hasResults ? `${logCount} ` : ""}logs${filterDesc}`;

  return (
    <SambaCard
      state={state}
      accentColor="slate"
      isExpanded={isContentVisible}
      onClick={() => setIsContentVisible(!isContentVisible)}
    >
      <SambaCardHeader icon={<FileText size={15} />} accentColor="slate">
        <SambaBadge color="slate">LOGS</SambaBadge>
        <span className="font-medium text-sm text-foreground truncate">
          {displayText}
        </span>
        {inProgress && (
          <SambaStateIndicator state="pending" pendingLabel="Reading..." />
        )}
        {aborted && (
          <SambaStateIndicator state="aborted" abortedLabel="Did not finish" />
        )}
        <div className="ml-auto">
          <SambaExpandIcon isExpanded={isContentVisible} />
        </div>
      </SambaCardHeader>
      <SambaCardContent isExpanded={isContentVisible}>
        <div className="text-xs">
          <CodeHighlight className="language-log">{children}</CodeHighlight>
        </div>
      </SambaCardContent>
    </SambaCard>
  );
};
