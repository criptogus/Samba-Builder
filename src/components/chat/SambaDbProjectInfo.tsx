import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CustomTagState } from "./stateTypes";
import { Database } from "lucide-react";
import {
  SambaCard,
  SambaCardHeader,
  SambaBadge,
  SambaExpandIcon,
  SambaStateIndicator,
  SambaCardContent,
} from "./SambaCardPrimitives";

interface SambaDbProjectInfoProps {
  provider: string;
  node: {
    properties: {
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function SambaDbProjectInfo({
  provider,
  node,
  children,
}: SambaDbProjectInfoProps) {
  const { t } = useTranslation("home");
  const [isContentVisible, setIsContentVisible] = useState(false);
  const { state } = node.properties;
  const isLoading = state === "pending";
  const isAborted = state === "aborted";
  const content = typeof children === "string" ? children : "";

  return (
    <SambaCard
      state={state}
      accentColor="teal"
      isExpanded={isContentVisible}
      onClick={() => setIsContentVisible(!isContentVisible)}
    >
      <SambaCardHeader icon={<Database size={15} />} accentColor="teal">
        <SambaBadge color="teal">
          {t("integrations.db.projectInfo", { provider })}
        </SambaBadge>
        {isLoading && (
          <SambaStateIndicator
            state="pending"
            pendingLabel={t("integrations.db.fetching")}
          />
        )}
        {isAborted && (
          <SambaStateIndicator
            state="aborted"
            abortedLabel={t("integrations.db.didNotFinish")}
          />
        )}
        <div className="ml-auto">
          <SambaExpandIcon isExpanded={isContentVisible} />
        </div>
      </SambaCardHeader>
      <SambaCardContent isExpanded={isContentVisible}>
        {content && (
          <div className="p-3 text-xs font-mono whitespace-pre-wrap max-h-80 overflow-y-auto bg-muted/20 rounded-lg">
            {content}
          </div>
        )}
      </SambaCardContent>
    </SambaCard>
  );
}
