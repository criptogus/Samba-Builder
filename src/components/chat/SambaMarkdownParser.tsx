import React, { useDeferredValue, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { SambaWrite } from "./SambaWrite";
import { SambaRename } from "./SambaRename";
import { SambaCopy } from "./SambaCopy";
import { SambaDelete } from "./SambaDelete";
import { SambaAddDependency } from "./SambaAddDependency";
import { SambaExecuteSql } from "./SambaExecuteSql";
import { SambaLogs } from "./SambaLogs";
import { SambaGrep } from "./SambaGrep";
import { SambaSearchChats } from "./SambaSearchChats";
import { SambaReadChat } from "./SambaReadChat";
import { SambaExploreCode } from "./SambaExploreCode";
import { SambaExploreChatHistory } from "./SambaExploreChatHistory";
import { SambaAddIntegration } from "./SambaAddIntegration";
import { SambaEnableNitro } from "./SambaEnableNitro";
import { SambaEdit } from "./SambaEdit";
import { SambaSearchReplace } from "./SambaSearchReplace";
import { SambaCodebaseContext } from "./SambaCodebaseContext";
import { SambaThink } from "./SambaThink";
import { CodeHighlight } from "./CodeHighlight";
import { useAtomValue } from "jotai";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import {
  useChatStreamPreview,
  useChatStreamState,
} from "@/hooks/useChatStream";
import { isStreamActive } from "@/chat_stream/transition";
import { CustomTagState } from "./stateTypes";
import { SambaOutput } from "./SambaOutput";
import { SambaProblemSummary } from "./SambaProblemSummary";
import { SambaSecurityFinding } from "./SambaSecurityFinding";
import { ipc } from "@/ipc/types";
import { SambaMcpToolCall } from "./SambaMcpToolCall";
import { SambaMcpToolResult } from "./SambaMcpToolResult";
import {
  buildMcpPairing,
  EMPTY_MCP_PAIRING,
  type McpPairing,
  type CustomTagBlock,
} from "./mcpPairing";
import { SambaMcpToolSearch } from "./SambaMcpToolSearch";
import { SambaMcpToolSchema } from "./SambaMcpToolSchema";
import { SambaWebSearchResult } from "./SambaWebSearchResult";
import { SambaWebSearch } from "./SambaWebSearch";
import { SambaWebCrawl } from "./SambaWebCrawl";
import { SambaWebFetch } from "./SambaWebFetch";
import { SambaImageGeneration } from "./SambaImageGeneration";
import { SambaCodeSearchResult } from "./SambaCodeSearchResult";
import { SambaCodeSearch } from "./SambaCodeSearch";
import { SambaRead } from "./SambaRead";
import { SambaListFiles } from "./SambaListFiles";
import { SambaDatabaseSchema } from "./SambaDatabaseSchema";
import { SambaDbTableSchema } from "./SambaDbTableSchema";
import { SambaSupabaseProjectInfo } from "./SambaSupabaseProjectInfo";
import { SambaNeonProjectInfo } from "./SambaNeonProjectInfo";
import { SambaStatus } from "./SambaStatus";
import { SambaCompaction } from "./SambaCompaction";
import { SambaWritePlan } from "./SambaWritePlan";
import { SambaExitPlan } from "./SambaExitPlan";
import { SambaQuestionnaire } from "./SambaQuestionnaire";
import { SambaStepLimit } from "./SambaStepLimit";
import { SambaAppBlueprintCard } from "./SambaAppBlueprintCard";
import { SambaTestAssertionsCard } from "./SambaTestAssertionsCard";
import { SambaReadGuide } from "./SambaReadGuide";
import { SambaScript } from "./SambaScript";
import { SambaGit } from "./SambaGit";
import { SambaSubagent } from "./SambaSubagent";
import { mapActionToButton } from "./ChatInput";
import { SpecialistNextStepHuddle } from "./SpecialistNextSteps";
import { SuggestedAction } from "@/lib/schemas";
import {
  nextStepActionFromAttributes,
  segmentClosedBlocks,
} from "@/lib/next_step_action";
import { FixAllErrorsButton } from "./FixAllErrorsButton";
import {
  advanceParser,
  type Block,
  getOpenBlock,
  initialParserState,
  parseFullMessage,
  type ParserState,
} from "@/lib/streamingMessageParser";

interface SambaMarkdownParserProps {
  content: string;
  messageId?: number;
  showStreamingPreview?: boolean;
}

const customLink = ({
  node: _node,
  ...props
}: {
  node?: any;
  [key: string]: any;
}) => (
  <a
    {...props}
    onClick={(e) => {
      const url = props.href;
      if (url) {
        e.preventDefault();
        ipc.system.openExternalUrl(url);
      }
    }}
  />
);

export const VanillaMarkdownParser = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: CodeHighlight,
        a: customLink,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

/**
 * Custom component to parse markdown content with Samba Builder-specific tags.
 *
 * The block list is sourced from a component-local incremental parser. Completed
 * blocks keep referential identity across streaming chunks, so React.memo can
 * skip prior blocks and leave only the open trailing block to re-render.
 */
export const SambaMarkdownParser: React.FC<SambaMarkdownParserProps> = ({
  content,
  messageId,
  showStreamingPreview = false,
}) => {
  const chatId = useAtomValue(selectedChatIdAtom);
  const streamState = useChatStreamState(chatId ?? undefined) ?? {
    type: "idle",
  };
  const isStreaming = isStreamActive(streamState);
  const deferredContent = useDeferredValue(content);
  const contentToParse = isStreaming ? deferredContent : content;

  // Component-local parser cache. Closed-block refs stay stable across chunks
  // so MemoClosedBlocks can skip its subtree; only the open trailing block
  // changes shape per chunk. On prefix-mismatch (full-message replace, etc.)
  // we restart from initialParserState — same correctness as a one-shot parse.
  //
  // Note: we write to parserCacheRef inside useMemo. React docs flag this as
  // a side effect during render; in practice the cache is purely advisory and
  // advanceParser is deterministic on (state, content), so the worst case
  // (StrictMode dev double-render, discarded concurrent render) is a wasted
  // re-parse, not a correctness issue.
  const parserCacheRef = useRef<{
    messageId?: number;
    content: string;
    state: ParserState;
  } | null>(null);

  const parserState = useMemo(() => {
    const cached = parserCacheRef.current;
    if (
      cached &&
      cached.messageId === messageId &&
      contentToParse.startsWith(cached.content)
    ) {
      const state = advanceParser(cached.state, contentToParse);
      parserCacheRef.current = { messageId, content: contentToParse, state };
      return state;
    }
    const state = advanceParser(initialParserState(), contentToParse);
    parserCacheRef.current = { messageId, content: contentToParse, state };
    return state;
  }, [messageId, contentToParse]);

  const closedBlocks = parserState.blocks;
  const openBlock = getOpenBlock(parserState);

  // Pair MCP tool-call blocks with their tool-result blocks by call-id so the
  // renderer can collapse the two into one card. Keyed on `closedBlocks`, which
  // only changes when a block closes (not per streamed token), so the scan
  // stays off the streaming hot path.
  const mcpPairing = useMemo(
    () => buildMcpPairing(closedBlocks),
    [closedBlocks],
  );

  // The button is hidden while streaming, so avoid scanning the block list on
  // every chunk. Do the full scan only for settled content.
  const { errorMessages, errorCount, lastErrorIndex } = useMemo(() => {
    if (isStreaming) {
      return EMPTY_ERROR_SCAN;
    }
    const errors: string[] = [];
    let lastIndex = -1;
    closedBlocks.forEach((block, index) => {
      if (
        block.kind === "custom-tag" &&
        block.tag === "samba-output" &&
        block.attributes.type === "error"
      ) {
        const msg = block.attributes.message?.trim();
        if (msg) {
          errors.push(msg);
          lastIndex = index;
        }
      }
    });
    return {
      errorMessages: errors,
      errorCount: errors.length,
      lastErrorIndex: lastIndex,
    };
  }, [closedBlocks, isStreaming]);

  const showFixAll =
    errorCount > 1 && !isStreaming && chatId !== null && chatId !== undefined;

  return (
    <>
      <MemoClosedBlocks
        blocks={closedBlocks}
        lastErrorIndex={lastErrorIndex}
        errorMessages={errorMessages}
        showFixAll={showFixAll}
        chatId={chatId ?? null}
        resultByCallId={mcpPairing.resultByCallId}
        callIds={mcpPairing.callIds}
        isStreaming={isStreaming}
      />
      {openBlock ? renderOpenBlock(openBlock, isStreaming, mcpPairing) : null}
      {showStreamingPreview && chatId !== null && chatId !== undefined && (
        <StreamingPreviewBlocks chatId={chatId} isStreaming={isStreaming} />
      )}
    </>
  );
};

// Stable ref for the "nothing to scan" return path so MemoClosedBlocks's
// memo doesn't invalidate every render during streaming.
const EMPTY_ERROR_SCAN: {
  errorMessages: string[];
  errorCount: number;
  lastErrorIndex: number;
} = { errorMessages: [], errorCount: 0, lastErrorIndex: -1 };

function StreamingPreviewBlocks({
  chatId,
  isStreaming,
}: {
  chatId: number;
  isStreaming: boolean;
}) {
  const previewXml = useChatStreamPreview(chatId);
  const previewBlocks = useMemo<Block[] | null>(() => {
    if (!previewXml) return null;
    return parseFullMessage(previewXml).blocks;
  }, [previewXml]);

  const previewPairing = useMemo(
    () => (previewBlocks ? buildMcpPairing(previewBlocks) : EMPTY_MCP_PAIRING),
    [previewBlocks],
  );

  if (!previewBlocks) return null;

  return (
    <>
      {previewBlocks.map((block) => (
        <React.Fragment key={`preview-${block.id}`}>
          {renderOpenBlock(block, isStreaming, previewPairing)}
        </React.Fragment>
      ))}
    </>
  );
}

function renderBlock(block: Block, isStreaming: boolean): React.ReactNode {
  if (block.kind === "markdown") {
    return block.content ? <MemoMarkdown content={block.content} /> : null;
  }
  return <MemoBlockCustomTag block={block} isStreaming={isStreaming} />;
}

// Render the trailing open block, accounting for MCP pairing: an open
// tool-call shows as a pending card; an open tool-result whose call already
// has a card is hidden (the call card will absorb it once it closes).
function renderOpenBlock(
  block: Block,
  isStreaming: boolean,
  pairing: McpPairing,
): React.ReactNode {
  if (block.kind === "custom-tag") {
    const callId = block.attributes["call-id"];
    if (callId && block.tag === "samba-mcp-tool-call") {
      return (
        <MemoMcpToolPair
          callBlock={block}
          resultBlock={pairing.resultByCallId.get(callId)}
          isStreaming={isStreaming}
        />
      );
    }
    if (
      callId &&
      block.tag === "samba-mcp-tool-result" &&
      pairing.callIds.has(callId)
    ) {
      return null;
    }
  }
  return renderBlock(block, isStreaming);
}

// Render a closed block, collapsing MCP call/result pairs into one card and
// hiding the standalone result block that the call card now renders.
function renderClosedBlock(
  block: Block,
  {
    resultByCallId,
    callIds,
    isStreaming,
  }: {
    resultByCallId: Map<string, CustomTagBlock>;
    callIds: Set<string>;
    isStreaming: boolean;
  },
): React.ReactNode {
  if (block.kind === "custom-tag") {
    const callId = block.attributes["call-id"];
    if (callId && block.tag === "samba-mcp-tool-call") {
      return (
        <MemoMcpToolPair
          callBlock={block}
          resultBlock={resultByCallId.get(callId)}
          isStreaming={isStreaming}
        />
      );
    }
    // Hide the standalone result only when its call is on screen to absorb it;
    // an unmatched result still renders on its own.
    if (
      callId &&
      block.tag === "samba-mcp-tool-result" &&
      callIds.has(callId)
    ) {
      return null;
    }
  }
  return renderBlock(block, false);
}

// One card for an MCP tool call + its result. Memoizes on both block refs;
// once the result is present the card is "finished" regardless of streaming,
// so isStreaming is only compared while still waiting for a result.
const MemoMcpToolPair = React.memo(
  function MemoMcpToolPair({
    callBlock,
    resultBlock,
    isStreaming,
  }: {
    callBlock: CustomTagBlock;
    resultBlock: CustomTagBlock | undefined;
    isStreaming: boolean;
  }) {
    const isError = resultBlock?.attributes["is-error"] === "true";
    const state: CustomTagState = !resultBlock
      ? isStreaming
        ? "pending"
        : "aborted"
      : isError
        ? "aborted"
        : "finished";
    return (
      <SambaMcpToolCall
        node={{
          properties: {
            serverName: callBlock.attributes.server || "",
            toolName: callBlock.attributes.tool || "",
            autoApprovedReason:
              callBlock.attributes["auto-approved-reason"] || "",
          },
        }}
        resultContent={resultBlock?.content}
        state={state}
        isError={isError}
      >
        {callBlock.content}
      </SambaMcpToolCall>
    );
  },
  (prev, next) =>
    prev.callBlock === next.callBlock &&
    prev.resultBlock === next.resultBlock &&
    (next.resultBlock != null || prev.isStreaming === next.isStreaming),
);

// Memoized wrapper for closed blocks. Memo hits when blocks ref + error
// props are unchanged, so the closed-block subtree is skipped per chunk.
// Closed children also memo on `prev.block === next.block` and skip their
// subtrees on commit chunks.
const MemoClosedBlocks = React.memo(function MemoClosedBlocks({
  blocks,
  lastErrorIndex,
  errorMessages,
  showFixAll,
  chatId,
  resultByCallId,
  callIds,
  isStreaming,
}: {
  blocks: Block[];
  lastErrorIndex: number;
  errorMessages: string[];
  showFixAll: boolean;
  chatId: number | null;
  resultByCallId: Map<string, CustomTagBlock>;
  callIds: Set<string>;
  isStreaming: boolean;
}) {
  // Hoisted once per render rather than allocated per block in the map.
  const mcpCtx = { resultByCallId, callIds, isStreaming };
  const segments = segmentClosedBlocks(blocks);
  return (
    <>
      {segments.map((segment, segmentIndex) => {
        if (segment.kind === "next-steps") {
          return (
            <SpecialistNextStepHuddle
              key={`huddle-${segment.blocks[0]?.id ?? segmentIndex}`}
              blocks={segment.blocks}
            />
          );
        }
        const block = segment.block;
        const index = blocks.indexOf(block);
        return (
          <React.Fragment key={block.id}>
            {renderClosedBlock(block, mcpCtx)}
            {showFixAll &&
              index === lastErrorIndex &&
              chatId !== null &&
              chatId !== undefined && (
                <div className="mt-3 w-full flex">
                  <FixAllErrorsButton
                    errorMessages={errorMessages}
                    chatId={chatId}
                  />
                </div>
              )}
          </React.Fragment>
        );
      })}
    </>
  );
});

// Module-level constants so MemoMarkdown never gets fresh refs for these
// props, which would defeat ReactMarkdown's internal prop-equality checks.
const REMARK_PLUGINS = [remarkGfm];
const MARKDOWN_COMPONENTS = { code: CodeHighlight, a: customLink };

// Memoized markdown piece. Without this, ReactMarkdown re-parses every
// completed segment's text into an AST on every streaming chunk.
const MemoMarkdown = React.memo(function MemoMarkdown({
  content,
}: {
  content: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      components={MARKDOWN_COMPONENTS}
    >
      {content}
    </ReactMarkdown>
  );
});

// Memoized custom-tag block. The incremental parser preserves the Block
// reference for any completed (closed) tag across streaming patches, so
// referential equality on `block` is sufficient — completed blocks
// short-circuit and skip renderCustomTag entirely.
const MemoBlockCustomTag = React.memo(
  function MemoBlockCustomTag({
    block,
    isStreaming,
  }: {
    block: CustomTagBlock;
    isStreaming: boolean;
  }) {
    return <>{renderCustomTag(block, { isStreaming })}</>;
  },
  (prev, next) =>
    prev.block === next.block &&
    // Completed tags ignore isStreaming (getState returns "finished"
    // regardless), so skip the check to avoid one-time re-renders of every
    // completed tag when streaming ends.
    (prev.block.inProgress === false || prev.isStreaming === next.isStreaming),
);

function getState({
  isStreaming,
  inProgress,
  explicitState,
}: {
  isStreaming?: boolean;
  inProgress?: boolean;
  explicitState?: string;
}): CustomTagState {
  if (
    explicitState === "aborted" ||
    explicitState === "error" ||
    explicitState === "finished" ||
    explicitState === "warning"
  ) {
    return explicitState;
  }
  if (explicitState === "in-progress" || explicitState === "pending") {
    return "pending";
  }
  if (!inProgress) {
    return "finished";
  }
  return isStreaming ? "pending" : "aborted";
}

/**
 * Render a custom tag based on its type
 */
function renderCustomTag(
  block: CustomTagBlock,
  { isStreaming }: { isStreaming: boolean },
): React.ReactNode {
  const { tag, attributes, content, inProgress } = block;

  switch (tag) {
    case "samba-subagent": {
      const subagentChatId = Number(attributes["chat-id"]);
      if (!Number.isSafeInteger(subagentChatId)) return null;
      return (
        <SambaSubagent
          chatId={subagentChatId}
          threadId={attributes["thread-id"] || ""}
          persona={attributes.persona || "agent"}
          taskName={attributes["task-name"] || "Sub-agent task"}
          renderActivity={(xml, activityId) => (
            <SambaMarkdownParser content={xml} messageId={activityId} />
          )}
        />
      );
    }
    case "samba-read":
      return (
        <SambaRead
          node={{
            properties: {
              path: attributes.path || "",
              startLine: attributes.start_line || "",
              endLine: attributes.end_line || "",
              appName: attributes.app_name || "",
            },
          }}
        >
          {content}
        </SambaRead>
      );
    case "samba-git":
      return (
        <SambaGit
          node={{
            properties: {
              ...attributes,
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaGit>
      );
    case "samba-web-search":
      return (
        <SambaWebSearch
          node={{
            properties: {
              query: attributes.query || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaWebSearch>
      );
    case "samba-search-chats":
      return (
        <SambaSearchChats
          node={{
            properties: {
              query: attributes.query || "",
              indexStatus: attributes["index-status"] || "",
              resultCount: attributes["result-count"],
              state: getState({
                isStreaming,
                inProgress,
                explicitState: attributes.state as CustomTagState,
              }),
            },
          }}
        >
          {content}
        </SambaSearchChats>
      );
    case "samba-read-chat":
      return (
        <SambaReadChat
          node={{
            properties: {
              chatId: attributes["chat-id"] || "",
              title: attributes.title || "",
              range: attributes.range || "",
              state: getState({
                isStreaming,
                inProgress,
                explicitState: attributes.state as CustomTagState,
              }),
            },
          }}
        >
          {content}
        </SambaReadChat>
      );
    case "samba-web-crawl":
      return (
        <SambaWebCrawl
          node={{
            properties: {},
          }}
        >
          {content}
        </SambaWebCrawl>
      );
    case "samba-web-fetch":
      return (
        <SambaWebFetch
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaWebFetch>
      );
    case "samba-code-search":
      return (
        <SambaCodeSearch
          node={{
            properties: {
              query: attributes.query || "",
              state: getState({
                isStreaming,
                inProgress,
                explicitState: attributes.state,
              }),
              appName: attributes.app_name || "",
            },
          }}
        >
          {content}
        </SambaCodeSearch>
      );
    case "samba-code-search-result":
      return (
        <SambaCodeSearchResult
          node={{
            properties: {},
          }}
        >
          {content}
        </SambaCodeSearchResult>
      );
    case "samba-web-search-result":
      return (
        <SambaWebSearchResult
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaWebSearchResult>
      );
    case "think":
      return (
        <SambaThink
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaThink>
      );
    // "samba-generate-test" is legacy: no longer emitted, but historical chats
    // still contain it. Both tags carry a path/description and a file body, so
    // the old test cards render as plain file-write cards instead of raw markup.
    case "samba-generate-test":
    case "samba-write":
      return (
        <SambaWrite
          node={{
            properties: {
              path: attributes.path || "",
              description: attributes.description || "",
              state: getState({
                isStreaming,
                inProgress,
                explicitState: attributes.state,
              }),
            },
          }}
        >
          {content}
        </SambaWrite>
      );

    case "samba-rename":
      return (
        <SambaRename
          node={{
            properties: {
              from: attributes.from || "",
              to: attributes.to || "",
            },
          }}
        >
          {content}
        </SambaRename>
      );

    case "samba-copy":
      return (
        <SambaCopy
          node={{
            properties: {
              from: attributes.from || "",
              to: attributes.to || "",
              description: attributes.description || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaCopy>
      );

    case "samba-delete":
      return (
        <SambaDelete
          node={{
            properties: {
              path: attributes.path || "",
            },
          }}
        >
          {content}
        </SambaDelete>
      );

    case "samba-add-dependency":
      return (
        <SambaAddDependency
          node={{
            properties: {
              packages: attributes.packages || "",
            },
          }}
        >
          {content}
        </SambaAddDependency>
      );

    case "samba-execute-sql":
      return (
        <SambaExecuteSql
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
              description: attributes.description || "",
            },
          }}
        >
          {content}
        </SambaExecuteSql>
      );

    case "samba-read-logs":
      return (
        <SambaLogs
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
              time: attributes.time || "",
              type: attributes.type || "",
              level: attributes.level || "",
              count: attributes.count || "",
            },
          }}
        >
          {content}
        </SambaLogs>
      );

    case "samba-grep":
      return (
        <SambaGrep
          node={{
            properties: {
              state: getState({
                isStreaming,
                inProgress,
                explicitState: attributes.state,
              }),
              query: attributes.query || "",
              include: attributes.include || "",
              exclude: attributes.exclude || "",
              "case-sensitive": attributes["case-sensitive"] || "",
              count: attributes.count || "",
              total: attributes.total || "",
              truncated: attributes.truncated || "",
              appName: attributes.app_name || "",
            },
          }}
        >
          {content}
        </SambaGrep>
      );

    case "samba-explore-chat-history":
      return (
        <SambaExploreChatHistory
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
              query: attributes.query || "",
              chats: attributes.chats || "",
              evidence: attributes.evidence || "",
              outcome: attributes.outcome || "",
            },
          }}
        >
          {content}
        </SambaExploreChatHistory>
      );

    case "samba-explore-code":
      return (
        <SambaExploreCode
          node={{
            properties: {
              state: getState({
                isStreaming,
                inProgress,
                explicitState: attributes.state,
              }),
              query: attributes.query || "",
              appName: attributes.app_name || "",
              files: attributes.files || "",
              symbols: attributes.symbols || "",
              indexMs: attributes.index_ms || "",
              searchMs: attributes.search_ms || "",
              truncated: attributes.truncated || "",
            },
          }}
        >
          {content}
        </SambaExploreCode>
      );

    case "samba-add-integration":
      return (
        <SambaAddIntegration
          provider={
            attributes.provider === "neon" || attributes.provider === "supabase"
              ? attributes.provider
              : undefined
          }
          outcome={
            attributes.outcome === "pending" ||
            attributes.outcome === "skipped" ||
            attributes.outcome === "completed" ||
            attributes.outcome === "dismissed"
              ? attributes.outcome
              : undefined
          }
        >
          {content}
        </SambaAddIntegration>
      );

    case "samba-enable-nitro":
      return <SambaEnableNitro state={getState({ isStreaming, inProgress })} />;

    case "samba-edit":
      return (
        <SambaEdit
          node={{
            properties: {
              path: attributes.path || "",
              description: attributes.description || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaEdit>
      );

    case "samba-search-replace":
      return (
        <SambaSearchReplace
          node={{
            properties: {
              path: attributes.path || "",
              description: attributes.description || "",
              state: getState({
                isStreaming,
                inProgress,
                explicitState: attributes.state,
              }),
            },
          }}
        >
          {content}
        </SambaSearchReplace>
      );

    case "samba-codebase-context":
      return (
        <SambaCodebaseContext
          node={{
            properties: {
              files: attributes.files || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaCodebaseContext>
      );

    case "samba-mcp-tool-search":
      return (
        <SambaMcpToolSearch
          node={{
            properties: {
              query: attributes.query || "",
              server: attributes.server || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaMcpToolSearch>
      );

    case "samba-mcp-tool-schema":
      return (
        <SambaMcpToolSchema
          node={{
            properties: {
              tools: attributes.tools || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaMcpToolSchema>
      );
    case "samba-mcp-tool-call":
      return (
        <SambaMcpToolCall
          node={{
            properties: {
              serverName: attributes.server || "",
              toolName: attributes.tool || "",
              autoApprovedReason: attributes["auto-approved-reason"] || "",
            },
          }}
        >
          {content}
        </SambaMcpToolCall>
      );

    case "samba-mcp-tool-result":
      return (
        <SambaMcpToolResult
          node={{
            properties: {
              serverName: attributes.server || "",
              toolName: attributes.tool || "",
            },
          }}
        >
          {content}
        </SambaMcpToolResult>
      );

    case "samba-output":
      return (
        <SambaOutput
          type={attributes.type as "warning" | "error"}
          message={attributes.message}
        >
          {content}
        </SambaOutput>
      );

    case "samba-script":
      return (
        <SambaScript
          node={{
            properties: {
              description: attributes.description || "",
              truncated: attributes.truncated || "",
              executionMs: attributes["execution-ms"] || "",
              fullOutputPath: attributes["full-output-path"] || "",
            },
          }}
        >
          {content}
        </SambaScript>
      );

    case "samba-problem-report":
      return (
        <SambaProblemSummary summary={attributes.summary}>
          {content}
        </SambaProblemSummary>
      );

    case "samba-security-finding":
      return (
        <SambaSecurityFinding title={attributes.title} level={attributes.level}>
          {content}
        </SambaSecurityFinding>
      );

    case "samba-chat-summary":
      // Don't render anything for samba-chat-summary
      return null;

    case "samba-command":
      if (attributes.type) {
        const nextStep = nextStepActionFromAttributes(attributes);
        const action = (nextStep ?? {
          id: attributes.type,
        }) as SuggestedAction;
        return <>{mapActionToButton(action)}</>;
      }
      return null;

    case "samba-list-files":
      return (
        <SambaListFiles
          node={{
            properties: {
              directory: attributes.directory || "",
              recursive: attributes.recursive || "",
              include_ignored:
                attributes.include_ignored || attributes.include_hidden || "",
              state: getState({
                isStreaming,
                inProgress,
                explicitState: attributes.state,
              }),
              appName: attributes.app_name || "",
            },
          }}
        >
          {content}
        </SambaListFiles>
      );

    case "samba-database-schema":
      return (
        <SambaDatabaseSchema
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaDatabaseSchema>
      );

    case "samba-db-table-schema":
    // Backward compat: old messages used provider-specific tags
    case "samba-supabase-table-schema":
    case "samba-neon-table-schema":
      return (
        <SambaDbTableSchema
          provider={
            tag === "samba-supabase-table-schema"
              ? "Supabase"
              : tag === "samba-neon-table-schema"
                ? "Neon"
                : (attributes.provider as string) || ""
          }
          node={{
            properties: {
              table: attributes.table || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaDbTableSchema>
      );

    case "samba-supabase-project-info":
      return (
        <SambaSupabaseProjectInfo
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaSupabaseProjectInfo>
      );

    case "samba-neon-project-info":
      return (
        <SambaNeonProjectInfo
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaNeonProjectInfo>
      );

    case "samba-read-guide":
      return (
        <SambaReadGuide
          node={{
            properties: {
              name: attributes.name || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaReadGuide>
      );

    case "samba-image-generation":
      return (
        <SambaImageGeneration
          node={{
            properties: {
              prompt: attributes.prompt || "",
              path: attributes.path || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaImageGeneration>
      );

    case "samba-status":
      return (
        <SambaStatus
          node={{
            properties: {
              title: attributes.title || "Processing...",
              state: getState({
                isStreaming,
                inProgress,
                explicitState: attributes.state,
              }),
            },
          }}
        >
          {content}
        </SambaStatus>
      );

    case "samba-compaction":
      return (
        <SambaCompaction
          node={{
            properties: {
              title: attributes.title || "Compacting conversation",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaCompaction>
      );

    case "samba-write-plan":
      return (
        <SambaWritePlan
          node={{
            properties: {
              title: attributes.title || "Implementation Plan",
              summary: attributes.summary,
              complete: attributes.complete,
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaWritePlan>
      );

    case "samba-exit-plan":
      return (
        <SambaExitPlan
          node={{
            properties: {
              notes: attributes.notes,
            },
          }}
        />
      );

    case "samba-questionnaire":
      return <SambaQuestionnaire>{content}</SambaQuestionnaire>;

    case "samba-step-limit":
      return (
        <SambaStepLimit
          node={{
            properties: {
              steps: attributes.steps,
              limit: attributes.limit,
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaStepLimit>
      );

    case "samba-app-blueprint":
      return (
        <SambaAppBlueprintCard
          node={{
            properties: {
              "app-name": attributes["app-name"] || "",
              template: attributes.template || "react",
              theme: attributes.theme || "default",
              "design-direction": attributes["design-direction"] || "",
              "primary-color": attributes["primary-color"] || "",
              complete: attributes.complete,
              state: getState({ isStreaming, inProgress }),
            },
          }}
        />
      );

    case "samba-test-assertions":
      return (
        <SambaTestAssertionsCard
          node={{
            properties: {
              "proposal-id": attributes["proposal-id"] || "",
              "request-id": attributes["request-id"] || "",
              status: attributes.status || "proposed",
              "spec-path": attributes["spec-path"] || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </SambaTestAssertionsCard>
      );

    default:
      return null;
  }
}
