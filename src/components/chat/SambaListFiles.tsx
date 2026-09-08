import React, { useState } from "react";
import { CustomTagState } from "./stateTypes";
import { FolderOpen } from "lucide-react";
import {
  SambaCard,
  SambaCardHeader,
  SambaBadge,
  SambaExpandIcon,
  SambaStateIndicator,
  SambaCardContent,
} from "./SambaCardPrimitives";

interface SambaListFilesProps {
  node: {
    properties: {
      directory?: string;
      recursive?: string;
      include_ignored?: string;
      state?: CustomTagState;
      appName?: string;
    };
  };
  children: React.ReactNode;
}

export function SambaListFiles({ node, children }: SambaListFilesProps) {
  const { directory, recursive, include_ignored, state, appName } =
    node.properties;
  const isLoading = state === "pending";
  const isRecursive = recursive === "true";
  const isIncludeIgnored = include_ignored === "true";
  const content = typeof children === "string" ? children : "";
  const [isExpanded, setIsExpanded] = useState(false);

  const title = directory ? directory : "List Files";

  return (
    <SambaCard
      state={state}
      accentColor="slate"
      isExpanded={isExpanded}
      onClick={() => setIsExpanded(!isExpanded)}
      data-testid="samba-list-files"
    >
      <SambaCardHeader icon={<FolderOpen size={15} />} accentColor="slate">
        <span className="font-medium text-sm text-foreground truncate">
          {title}
        </span>
        {appName && <SambaBadge color="sky">{appName}</SambaBadge>}
        {isRecursive && <SambaBadge color="slate">recursive</SambaBadge>}
        {isIncludeIgnored && (
          <SambaBadge color="slate">include ignored</SambaBadge>
        )}
        {isLoading && (
          <SambaStateIndicator state="pending" pendingLabel="Listing..." />
        )}
        <div className="ml-auto">
          <SambaExpandIcon isExpanded={isExpanded} />
        </div>
      </SambaCardHeader>
      <SambaCardContent isExpanded={isExpanded}>
        {content && (
          <div className="p-3 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto bg-muted/20 rounded-lg">
            {content}
          </div>
        )}
      </SambaCardContent>
    </SambaCard>
  );
}
