import type React from "react";
import type { ReactNode } from "react";
import { FileEdit } from "lucide-react";
import {
  SambaCard,
  SambaCardHeader,
  SambaBadge,
  SambaFilePath,
  SambaDescription,
} from "./SambaCardPrimitives";
import { CustomTagState } from "./stateTypes";

interface SambaRenameProps {
  children?: ReactNode;
  node?: any;
  from?: string;
  to?: string;
}

export const SambaRename: React.FC<SambaRenameProps> = ({
  children,
  node,
  from: fromProp,
  to: toProp,
}) => {
  const from = fromProp || node?.properties?.from || "";
  const to = toProp || node?.properties?.to || "";
  const state = node?.properties?.state as CustomTagState;

  const fromFileName = from ? from.split("/").pop() : "";
  const toFileName = to ? to.split("/").pop() : "";

  const displayTitle =
    fromFileName && toFileName
      ? `${fromFileName} → ${toFileName}`
      : fromFileName || toFileName || "";

  return (
    <SambaCard accentColor="amber" state={state}>
      <SambaCardHeader icon={<FileEdit size={15} />} accentColor="amber">
        {displayTitle && (
          <span className="font-medium text-sm text-foreground truncate">
            {displayTitle}
          </span>
        )}
        <SambaBadge color="amber">Rename</SambaBadge>
      </SambaCardHeader>
      {from && <SambaFilePath path={`From: ${from}`} />}
      {to && <SambaFilePath path={`To: ${to}`} />}
      {children && <SambaDescription>{children}</SambaDescription>}
    </SambaCard>
  );
};
