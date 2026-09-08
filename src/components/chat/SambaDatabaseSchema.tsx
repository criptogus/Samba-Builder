import React from "react";
import { CustomTagState } from "./stateTypes";
import { Database } from "lucide-react";
import {
  SambaCard,
  SambaCardHeader,
  SambaBadge,
  SambaStateIndicator,
} from "./SambaCardPrimitives";

interface SambaDatabaseSchemaProps {
  node: {
    properties: {
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function SambaDatabaseSchema({
  node,
  children,
}: SambaDatabaseSchemaProps) {
  const { state } = node.properties;
  const isLoading = state === "pending";
  const content = typeof children === "string" ? children : "";

  return (
    <SambaCard state={state} accentColor="teal">
      <SambaCardHeader icon={<Database size={15} />} accentColor="teal">
        <SambaBadge color="teal">Database Schema</SambaBadge>
        {isLoading && <SambaStateIndicator state="pending" />}
      </SambaCardHeader>
      {content && (
        <div className="px-3 pb-3">
          <div className="p-3 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto bg-muted/20 rounded-lg">
            {content}
          </div>
        </div>
      )}
    </SambaCard>
  );
}
