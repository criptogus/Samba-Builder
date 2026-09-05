import { getRemoteMcpCatalog } from "./remote_mcp_catalog";
import { GRANOLA_CATALOG_ENTRY, GRANOLA_URL } from "@/shared/meeting_briefing";

export async function getMeetingAwareMcpCatalog() {
  const remote = await getRemoteMcpCatalog();
  return [
    GRANOLA_CATALOG_ENTRY,
    ...remote.filter(
      (entry) =>
        entry.slug !== GRANOLA_CATALOG_ENTRY.slug &&
        !(entry.transport === "http" && entry.url === GRANOLA_URL),
    ),
  ];
}
