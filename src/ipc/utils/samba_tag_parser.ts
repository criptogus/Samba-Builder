import { normalizePath } from "../../../shared/normalizePath";
import { unescapeXmlAttr, unescapeXmlContent } from "../../../shared/xmlEscape";
import log from "electron-log";
import { SqlQuery } from "../../lib/schemas";

const logger = log.scope("samba_tag_parser");

interface SambaFileTag {
  path: string;
  content: string;
  description?: string;
}

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse `<tagName path="..." description="...">content</tagName>` occurrences
 * into file tags. Used for `<samba-write>`: a `path`/`description` plus a body
 * with optional surrounding markdown fences.
 */
function parseSambaFileTags(
  fullResponse: string,
  tagName: string,
): SambaFileTag[] {
  const escapedTagName = escapeRegexLiteral(tagName);
  const tagRegex = new RegExp(
    `<${escapedTagName}([^>]*)>([\\s\\S]*?)</${escapedTagName}>`,
    "gi",
  );
  const pathRegex = /path="([^"]+)"/;
  const descriptionRegex = /description="([^"]+)"/;

  let match;
  const tags: SambaFileTag[] = [];

  while ((match = tagRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1];
    let content = unescapeXmlContent(match[2].trim());

    const pathMatch = pathRegex.exec(attributesString);
    const descriptionMatch = descriptionRegex.exec(attributesString);

    if (pathMatch && pathMatch[1]) {
      const path = unescapeXmlAttr(pathMatch[1]);
      const description = descriptionMatch?.[1]
        ? unescapeXmlAttr(descriptionMatch[1])
        : undefined;

      const contentLines = content.split("\n");
      if (contentLines[0]?.startsWith("```")) {
        contentLines.shift();
      }
      if (contentLines[contentLines.length - 1]?.startsWith("```")) {
        contentLines.pop();
      }
      content = contentLines.join("\n");

      tags.push({ path: normalizePath(path), content, description });
    } else {
      logger.warn(
        `Found <${tagName}> tag without a valid 'path' attribute:`,
        match[0],
      );
    }
  }
  return tags;
}

export function getSambaWriteTags(fullResponse: string): SambaFileTag[] {
  return parseSambaFileTags(fullResponse, "samba-write");
}

export function getSambaRenameTags(fullResponse: string): {
  from: string;
  to: string;
}[] {
  const sambaRenameRegex =
    /<samba-rename from="([^"]+)" to="([^"]+)"[^>]*>([\s\S]*?)<\/samba-rename>/g;
  let match;
  const tags: { from: string; to: string }[] = [];
  while ((match = sambaRenameRegex.exec(fullResponse)) !== null) {
    tags.push({
      from: normalizePath(unescapeXmlAttr(match[1])),
      to: normalizePath(unescapeXmlAttr(match[2])),
    });
  }
  return tags;
}

export function getSambaCopyTags(fullResponse: string): {
  from: string;
  to: string;
  description?: string;
}[] {
  const sambaCopyRegex =
    /<samba-copy([^>]*?)(?:>([\s\S]*?)<\/samba-copy>|\/>)/gi;
  const fromRegex = /from="([^"]+)"/;
  const toRegex = /to="([^"]+)"/;
  const descriptionRegex = /description="([^"]+)"/;

  let match;
  const tags: { from: string; to: string; description?: string }[] = [];

  while ((match = sambaCopyRegex.exec(fullResponse)) !== null) {
    const attrs = match[1];
    const fromMatch = fromRegex.exec(attrs);
    const toMatch = toRegex.exec(attrs);
    const descriptionMatch = descriptionRegex.exec(attrs);

    if (fromMatch?.[1] && toMatch?.[1]) {
      tags.push({
        from: normalizePath(unescapeXmlAttr(fromMatch[1])),
        to: normalizePath(unescapeXmlAttr(toMatch[1])),
        description: descriptionMatch?.[1]
          ? unescapeXmlAttr(descriptionMatch[1])
          : undefined,
      });
    } else {
      logger.warn(
        "Found <samba-copy> tag without valid 'from' or 'to' attributes:",
        match[0],
      );
    }
  }
  return tags;
}

export function getSambaDeleteTags(fullResponse: string): string[] {
  const sambaDeleteRegex =
    /<samba-delete path="([^"]+)"[^>]*>([\s\S]*?)<\/samba-delete>/g;
  let match;
  const paths: string[] = [];
  while ((match = sambaDeleteRegex.exec(fullResponse)) !== null) {
    paths.push(normalizePath(unescapeXmlAttr(match[1])));
  }
  return paths;
}

export function getSambaAddDependencyTags(fullResponse: string): string[] {
  const sambaAddDependencyRegex =
    /<samba-add-dependency packages="([^"]+)">[^<]*<\/samba-add-dependency>/g;
  let match;
  const packages: string[] = [];
  while ((match = sambaAddDependencyRegex.exec(fullResponse)) !== null) {
    packages.push(...unescapeXmlAttr(match[1]).trim().split(/\s+/));
  }
  return packages;
}

export function getSambaChatSummaryTag(fullResponse: string): string | null {
  const sambaChatSummaryRegex =
    /<samba-chat-summary>([\s\S]*?)<\/samba-chat-summary>/g;
  const match = sambaChatSummaryRegex.exec(fullResponse);
  if (match && match[1]) {
    return unescapeXmlContent(match[1].trim());
  }
  return null;
}

export function getSambaExecuteSqlTags(fullResponse: string): SqlQuery[] {
  const sambaExecuteSqlRegex =
    /<samba-execute-sql([^>]*)>([\s\S]*?)<\/samba-execute-sql>/g;
  const descriptionRegex = /description="([^"]+)"/;
  let match;
  const queries: { content: string; description?: string }[] = [];

  while ((match = sambaExecuteSqlRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1] || "";
    let content = unescapeXmlContent(match[2].trim());
    const descriptionMatch = descriptionRegex.exec(attributesString);
    const description = descriptionMatch?.[1]
      ? unescapeXmlAttr(descriptionMatch[1])
      : undefined;

    // Handle markdown code blocks if present
    const contentLines = content.split("\n");
    if (contentLines[0]?.startsWith("```")) {
      contentLines.shift();
    }
    if (contentLines[contentLines.length - 1]?.startsWith("```")) {
      contentLines.pop();
    }
    content = contentLines.join("\n");

    queries.push({ content, description });
  }

  return queries;
}

export function getSambaCommandTags(fullResponse: string): string[] {
  const sambaCommandRegex =
    /<samba-command type="([^"]+)"[^>]*><\/samba-command>/g;
  let match;
  const commands: string[] = [];

  while ((match = sambaCommandRegex.exec(fullResponse)) !== null) {
    commands.push(unescapeXmlAttr(match[1]));
  }

  return commands;
}

export function getSambaSearchReplaceTags(fullResponse: string): {
  path: string;
  content: string;
  description?: string;
}[] {
  const sambaSearchReplaceRegex =
    /<samba-search-replace([^>]*)>([\s\S]*?)<\/samba-search-replace>/gi;
  const pathRegex = /path="([^"]+)"/;
  const descriptionRegex = /description="([^"]+)"/;

  let match;
  const tags: { path: string; content: string; description?: string }[] = [];

  while ((match = sambaSearchReplaceRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1] || "";
    let content = unescapeXmlContent(match[2].trim());

    const pathMatch = pathRegex.exec(attributesString);
    const descriptionMatch = descriptionRegex.exec(attributesString);

    if (pathMatch && pathMatch[1]) {
      const path = unescapeXmlAttr(pathMatch[1]);
      const description = descriptionMatch?.[1]
        ? unescapeXmlAttr(descriptionMatch[1])
        : undefined;

      // Handle markdown code fences if present
      const contentLines = content.split("\n");
      if (contentLines[0]?.startsWith("```")) {
        contentLines.shift();
      }
      if (contentLines[contentLines.length - 1]?.startsWith("```")) {
        contentLines.pop();
      }
      content = contentLines.join("\n");

      tags.push({ path: normalizePath(path), content, description });
    } else {
      logger.warn(
        "Found <samba-search-replace> tag without a valid 'path' attribute:",
        match[0],
      );
    }
  }
  return tags;
}
