import type React from "react";
import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import {
  SambaCard,
  SambaCardHeader,
  SambaBadge,
  SambaFilePath,
  SambaDescription,
} from "./SambaCardPrimitives";
import { CustomTagState } from "./stateTypes";

interface SambaDeleteProps {
  children?: ReactNode;
  node?: any;
  path?: string;
}

export const SambaDelete: React.FC<SambaDeleteProps> = ({
  children,
  node,
  path: pathProp,
}) => {
  const path = pathProp || node?.properties?.path || "";
  const state = node?.properties?.state as CustomTagState;
  const fileName = path ? path.split("/").pop() : "";

  return (
    <SambaCard accentColor="red" state={state}>
      <SambaCardHeader icon={<Trash2 size={15} />} accentColor="red">
        {fileName && (
          <span className="font-medium text-sm text-foreground truncate">
            {fileName}
          </span>
        )}
        <SambaBadge color="red">Delete</SambaBadge>
      </SambaCardHeader>
      <SambaFilePath path={path} />
      {children && <SambaDescription>{children}</SambaDescription>}
    </SambaCard>
  );
};
