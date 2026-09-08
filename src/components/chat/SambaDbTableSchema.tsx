import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CustomTagState } from "./stateTypes";
import { Table2 } from "lucide-react";
import {
  SambaCard,
  SambaCardHeader,
  SambaBadge,
  SambaExpandIcon,
  SambaStateIndicator,
  SambaCardContent,
} from "./SambaCardPrimitives";

interface SambaDbTableSchemaProps {
  provider: string;
  node: {
    properties: {
      table?: string;
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function SambaDbTableSchema({
  provider,
  node,
  children,
}: SambaDbTableSchemaProps) {
  const { t } = useTranslation("home");
  const [isContentVisible, setIsContentVisible] = useState(false);
  const { table, state } = node.properties;
  const isLoading = state === "pending";
  const isAborted = state === "aborted";
  const content = typeof children === "string" ? children : "";

  return (
    <SambaCard
      state={state}
      accentColor="teal"
      onClick={() => setIsContentVisible(!isContentVisible)}
      isExpanded={isContentVisible}
    >
      <SambaCardHeader icon={<Table2 size={15} />} accentColor="teal">
        <SambaBadge color="teal">
          {table
            ? t("integrations.db.tableSchema")
            : t("integrations.db.tableSchemaProvider", { provider })}
        </SambaBadge>
        {table && (
          <span className="font-medium text-sm text-foreground truncate">
            {table}
          </span>
        )}
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
