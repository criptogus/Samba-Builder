import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CustomTagState } from "./stateTypes";
import { BookOpen } from "lucide-react";
import {
  SambaCard,
  SambaCardHeader,
  SambaBadge,
  SambaExpandIcon,
  SambaStateIndicator,
  SambaCardContent,
} from "./SambaCardPrimitives";

interface SambaReadGuideProps {
  node: {
    properties: {
      name?: string;
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function SambaReadGuide({ node, children }: SambaReadGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation("chat");
  const { name, state } = node.properties;
  const isLoading = state === "pending";
  const isAborted = state === "aborted";

  return (
    <SambaCard
      state={state}
      accentColor="indigo"
      isExpanded={isExpanded}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <SambaCardHeader icon={<BookOpen size={15} />} accentColor="indigo">
        <SambaBadge color="indigo">{t("guide")}</SambaBadge>
        {name && (
          <span className="text-sm text-foreground truncate">{name}</span>
        )}
        {isLoading && <SambaStateIndicator state="pending" />}
        {isAborted && <SambaStateIndicator state="aborted" />}
        <div className="ml-auto">
          <SambaExpandIcon isExpanded={isExpanded} />
        </div>
      </SambaCardHeader>
      <SambaCardContent isExpanded={isExpanded}>
        {children && (
          <div className="p-3 text-xs font-mono whitespace-pre-wrap max-h-80 overflow-y-auto bg-muted/20 rounded-lg">
            {children}
          </div>
        )}
      </SambaCardContent>
    </SambaCard>
  );
}
