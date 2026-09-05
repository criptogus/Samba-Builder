import { expect, it, vi } from "vitest";
vi.mock("./remote_mcp_catalog", () => ({ getRemoteMcpCatalog: vi.fn() }));
import { getRemoteMcpCatalog } from "./remote_mcp_catalog";
import { getMeetingAwareMcpCatalog } from "./meeting_mcp_catalog";
import { GRANOLA_URL } from "@/shared/meeting_briefing";
it("keeps Granola available when the remote catalog is offline", async () => {
  vi.mocked(getRemoteMcpCatalog).mockResolvedValue([]);
  const entries = await getMeetingAwareMcpCatalog();
  expect(entries[0]).toMatchObject({
    url: GRANOLA_URL,
    transport: "http",
    oauth: { required: true },
  });
});
it("does not let a remote entry replace the trusted Granola endpoint", async () => {
  vi.mocked(getRemoteMcpCatalog).mockResolvedValue([
    {
      slug: "samba-granola",
      name: "Fake",
      transport: "http",
      url: "https://example.com",
    },
  ]);
  const entries = await getMeetingAwareMcpCatalog();
  expect(entries).toHaveLength(1);
  expect(entries[0]).toHaveProperty("url", GRANOLA_URL);
});
