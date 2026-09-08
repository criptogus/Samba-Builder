import type React from "react";
import type { ReactNode } from "react";
import { useState } from "react";
import { MessagesSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CodeHighlight } from "./CodeHighlight";
import { CustomTagState } from "./stateTypes";
import {
  SambaCard,
  SambaCardHeader,
  SambaBadge,
  SambaExpandIcon,
  SambaStateIndicator,
  SambaCardContent,
} from "./SambaCardPrimitives";

interface SambaSearchChatsProps {
  children?: ReactNode;
  node?: {
    properties?: {
      state?: CustomTagState;
      query?: string;
      indexStatus?: string;
      resultCount?: string;
    };
  };
}

export const SambaSearchChats: React.FC<SambaSearchChatsProps> = ({
  children,
  node,
}) => {
  const { t } = useTranslation("chat");
  const [isContentVisible, setIsContentVisible] = useState(false);

  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";
  const aborted = state === "aborted";

  const query = node?.properties?.query || "";
  const indexStatus = node?.properties?.indexStatus || "";
  const resultCount = node?.properties?.resultCount;

  return (
    <SambaCard
      state={state}
      accentColor="violet"
      onClick={() => setIsContentVisible(!isContentVisible)}
      isExpanded={isContentVisible}
      data-testid="samba-search-chats"
    >
      <SambaCardHeader icon={<MessagesSquare size={15} />} accentColor="violet">
        <SambaBadge color="violet">{t("searchChatsTool.badge")}</SambaBadge>
        <span className="font-medium text-sm text-foreground truncate">
          {`"${query}"`}
        </span>
        {resultCount !== undefined && !inProgress && (
          <span className="text-xs text-muted-foreground shrink-0">
            ({t("searchChatsTool.chatCount", { count: Number(resultCount) })})
          </span>
        )}
        {indexStatus === "indexing" && (
          <span className="text-xs text-muted-foreground shrink-0">
            {t("searchChatsTool.stillIndexing")}
          </span>
        )}
        {inProgress && (
          <SambaStateIndicator
            state="pending"
            pendingLabel={t("searchChatsTool.searching")}
          />
        )}
        {aborted && (
          <SambaStateIndicator
            state="aborted"
            abortedLabel={t("searchChatsTool.didNotFinish")}
          />
        )}
        <div className="ml-auto">
          <SambaExpandIcon isExpanded={isContentVisible} />
        </div>
      </SambaCardHeader>
      <SambaCardContent isExpanded={isContentVisible}>
        <div className="text-xs" onClick={(e) => e.stopPropagation()}>
          <CodeHighlight className="language-log">{children}</CodeHighlight>
        </div>
      </SambaCardContent>
    </SambaCard>
  );
};
