import type React from "react";
import { useState, type ReactNode } from "react";
import { Globe } from "lucide-react";
import { CustomTagState } from "./stateTypes";
import {
  SambaCard,
  SambaCardHeader,
  SambaBadge,
  SambaExpandIcon,
  SambaStateIndicator,
  SambaCardContent,
} from "./SambaCardPrimitives";

interface SambaWebSearchProps {
  children?: ReactNode;
  node?: any;
}

export const SambaWebSearch: React.FC<SambaWebSearchProps> = ({
  children,
  node,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const query =
    node?.properties?.query || (typeof children === "string" ? children : "");
  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";

  return (
    <SambaCard
      state={state}
      accentColor="blue"
      isExpanded={isExpanded}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <SambaCardHeader icon={<Globe size={15} />} accentColor="blue">
        <SambaBadge color="blue">Web Search</SambaBadge>
        {!isExpanded && query && (
          <span className="text-sm text-muted-foreground italic truncate">
            {query}
          </span>
        )}
        {inProgress && (
          <SambaStateIndicator state="pending" pendingLabel="Searching..." />
        )}
        <div className="ml-auto">
          <SambaExpandIcon isExpanded={isExpanded} />
        </div>
      </SambaCardHeader>
      <SambaCardContent isExpanded={isExpanded}>
        <div className="text-sm text-muted-foreground space-y-2">
          {query && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Query:
              </span>
              <div className="italic mt-0.5 text-foreground">{query}</div>
            </div>
          )}
          {children && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Results:
              </span>
              <div className="mt-0.5 text-foreground">{children}</div>
            </div>
          )}
        </div>
      </SambaCardContent>
    </SambaCard>
  );
};
