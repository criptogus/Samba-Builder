import type React from "react";
import type { ReactNode } from "react";
import { Copy } from "lucide-react";
import {
  SambaCard,
  SambaCardHeader,
  SambaBadge,
  SambaFilePath,
  SambaDescription,
  SambaStateIndicator,
} from "./SambaCardPrimitives";
import { CustomTagState } from "./stateTypes";

interface SambaCopyProps {
  children?: ReactNode;
  node?: any;
}

export const SambaCopy: React.FC<SambaCopyProps> = ({ children, node }) => {
  const from = node?.properties?.from || "";
  const to = node?.properties?.to || "";
  const description = node?.properties?.description || "";
  const state = node?.properties?.state as CustomTagState;

  const toFileName = to ? to.split("/").pop() : "";
  // Hide the "From" line for temp attachment paths (absolute paths) since they
  // show cryptic hash filenames that mean nothing to the user.
  const isTempAttachment =
    /^(\/|[A-Za-z]:\\)/.test(from) || from.includes(".samba/media/");

  return (
    <SambaCard accentColor="teal" state={state}>
      <SambaCardHeader icon={<Copy size={15} />} accentColor="teal">
        {toFileName && (
          <span className="font-medium text-sm text-foreground truncate">
            {toFileName}
          </span>
        )}
        <SambaBadge color="teal">Copy</SambaBadge>
        <span className="ml-auto">
          {state === "pending" && (
            <SambaStateIndicator state="pending" pendingLabel="Copying..." />
          )}
          {state === "aborted" && (
            <SambaStateIndicator
              state="aborted"
              abortedLabel="Did not finish"
            />
          )}
          {state === "finished" && (
            <SambaStateIndicator state="finished" finishedLabel="Copied" />
          )}
        </span>
      </SambaCardHeader>
      {from && !isTempAttachment && <SambaFilePath path={`From: ${from}`} />}
      {to && <SambaFilePath path={`To: ${to}`} />}
      {description && <SambaDescription>{description}</SambaDescription>}
      {children && <SambaDescription>{children}</SambaDescription>}
    </SambaCard>
  );
};
