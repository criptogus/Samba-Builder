import { describe, expect, it } from "vitest";
import { buildMcpPairing } from "./mcpPairing";
import { parseFullMessage } from "@/lib/streamingMessageParser";

// Builds the block list for the out-of-order interleaving the AI SDK emits
// for two parallel tools: callA, callB, then results in completion order.
function outOfOrderBlocks() {
  const xml = [
    `<samba-mcp-tool-call server="s" tool="slow" call-id="A">`,
    `{"a":1}`,
    `</samba-mcp-tool-call>`,
    `<samba-mcp-tool-call server="s" tool="fast" call-id="B">`,
    `{"b":2}`,
    `</samba-mcp-tool-call>`,
    `<samba-mcp-tool-result server="s" tool="fast" call-id="B">`,
    `fastresult`,
    `</samba-mcp-tool-result>`,
    `<samba-mcp-tool-result server="s" tool="slow" call-id="A">`,
    `slowresult`,
    `</samba-mcp-tool-result>`,
  ].join("\n");
  return parseFullMessage(xml).blocks;
}

describe("buildMcpPairing", () => {
  it("pairs results to calls by call-id across out-of-order interleaving", () => {
    const pairing = buildMcpPairing(outOfOrderBlocks());

    expect(pairing.callIds).toEqual(new Set(["A", "B"]));
    expect(pairing.resultByCallId.get("A")?.content).toContain("slowresult");
    expect(pairing.resultByCallId.get("B")?.content).toContain("fastresult");
  });

  it("leaves a call unpaired when its result has not arrived yet", () => {
    const xml = [
      `<samba-mcp-tool-call server="s" tool="slow" call-id="A">`,
      `{"a":1}`,
      `</samba-mcp-tool-call>`,
    ].join("\n");
    const pairing = buildMcpPairing(parseFullMessage(xml).blocks);

    expect(pairing.callIds).toEqual(new Set(["A"]));
    expect(pairing.resultByCallId.has("A")).toBe(false);
  });

  it("does not mark an unmatched result for hiding (no matching call id)", () => {
    // A result whose call block is absent must stay visible: the renderer hides
    // a result only when callIds contains its call-id.
    const xml = [
      `<samba-mcp-tool-result server="s" tool="orphan" call-id="Z">`,
      `orphaned`,
      `</samba-mcp-tool-result>`,
    ].join("\n");
    const pairing = buildMcpPairing(parseFullMessage(xml).blocks);

    expect(pairing.callIds.has("Z")).toBe(false);
    expect(pairing.resultByCallId.get("Z")?.content).toContain("orphaned");
  });

  it("ignores legacy blocks without a call-id", () => {
    const xml = [
      `<samba-mcp-tool-call server="s" tool="t">`,
      `{"a":1}`,
      `</samba-mcp-tool-call>`,
      `<samba-mcp-tool-result server="s" tool="t">`,
      `r`,
      `</samba-mcp-tool-result>`,
    ].join("\n");
    const pairing = buildMcpPairing(parseFullMessage(xml).blocks);

    expect(pairing.callIds.size).toBe(0);
    expect(pairing.resultByCallId.size).toBe(0);
  });
});
