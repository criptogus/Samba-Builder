import React, { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { VanillaMarkdownParser } from "./SambaMarkdownParser";
import { CustomTagState } from "./stateTypes";
import {
  SambaCard,
  SambaCardHeader,
  SambaBadge,
  SambaExpandIcon,
  SambaStateIndicator,
  SambaCardContent,
} from "./SambaCardPrimitives";

interface SambaWebSearchResultProps {
  node?: any;
  children?: React.ReactNode;
}

export const SambaWebSearchResult: React.FC<SambaWebSearchResultProps> = ({
  children,
  node,
}) => {
  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";
  const [isExpanded, setIsExpanded] = useState(inProgress);

  useEffect(() => {
    if (!inProgress && isExpanded) {
      setIsExpanded(false);
    }
  }, [inProgress]);

  return (
    <SambaCard
      state={state}
      accentColor="blue"
      onClick={() => setIsExpanded(!isExpanded)}
      isExpanded={isExpanded}
    >
      <SambaCardHeader icon={<Globe size={15} />} accentColor="blue">
        <SambaBadge color="blue">Web Search Result</SambaBadge>
        {inProgress && (
          <SambaStateIndicator state="pending" pendingLabel="Loading..." />
        )}
        <div className="ml-auto">
          <SambaExpandIcon isExpanded={isExpanded} />
        </div>
      </SambaCardHeader>
      <SambaCardContent isExpanded={isExpanded}>
        <div className="text-sm text-muted-foreground">
          {typeof children === "string" ? (
            <VanillaMarkdownParser content={children} />
          ) : (
            children
          )}
        </div>
      </SambaCardContent>
    </SambaCard>
  );
};
