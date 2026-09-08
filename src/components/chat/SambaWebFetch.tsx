import type { FC, ReactNode } from "react";
import { Globe } from "lucide-react";
import {
  SambaCard,
  SambaCardHeader,
  SambaBadge,
  SambaStateIndicator,
} from "./SambaCardPrimitives";
import { CustomTagState } from "./stateTypes";

interface SambaWebFetchProps {
  children?: ReactNode;
  node?: {
    properties: {
      state?: CustomTagState;
    };
  };
}

export const SambaWebFetch: FC<SambaWebFetchProps> = ({ children, node }) => {
  const state = node?.properties?.state as CustomTagState;

  return (
    <SambaCard state={state} accentColor="blue">
      <SambaCardHeader icon={<Globe size={15} />} accentColor="blue">
        <SambaBadge color="blue">Web Fetch</SambaBadge>
        {state && (
          <SambaStateIndicator
            state={state}
            pendingLabel="Fetching..."
            finishedLabel="Done"
            abortedLabel="Aborted"
          />
        )}
      </SambaCardHeader>
      {children && (
        <div className="px-3 pb-2 text-sm italic text-muted-foreground">
          {children}
        </div>
      )}
    </SambaCard>
  );
};
