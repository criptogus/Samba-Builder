import React, { useState } from "react";
import { ShieldAlert } from "lucide-react";
import {
  SambaCard,
  SambaCardHeader,
  SambaExpandIcon,
  SambaCardContent,
  type SambaAccentColor,
} from "./SambaCardPrimitives";
import {
  SeverityBadge,
  type SecurityLevel,
} from "@/components/security/severity";
import { VanillaMarkdownParser } from "./SambaMarkdownParser";

const VALID_LEVELS: readonly SecurityLevel[] = [
  "critical",
  "high",
  "medium",
  "low",
];

function isSecurityLevel(value: string | undefined): value is SecurityLevel {
  return value != null && (VALID_LEVELS as readonly string[]).includes(value);
}

// Map a finding's severity onto the card's left-accent color. The exact level
// is still conveyed precisely by the SeverityBadge; the accent is a coarser cue.
const ACCENT_BY_LEVEL: Record<SecurityLevel, SambaAccentColor> = {
  critical: "red",
  high: "red",
  medium: "amber",
  low: "slate",
};

interface SambaSecurityFindingProps {
  title?: string;
  level?: string;
  children?: React.ReactNode;
}

export function SambaSecurityFinding({
  title,
  level,
  children,
}: SambaSecurityFindingProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const validLevel = isSecurityLevel(level) ? level : undefined;
  const accentColor: SambaAccentColor = validLevel
    ? ACCENT_BY_LEVEL[validLevel]
    : "slate";
  const content = typeof children === "string" ? children : "";

  return (
    <SambaCard
      accentColor={accentColor}
      showAccent
      isExpanded={isExpanded}
      onClick={() => setIsExpanded(!isExpanded)}
      data-testid="security-finding"
    >
      <SambaCardHeader
        icon={<ShieldAlert size={15} />}
        accentColor={accentColor}
      >
        {validLevel && <SeverityBadge level={validLevel} />}
        <span className="font-medium text-sm text-foreground truncate">
          {title || "Security finding"}
        </span>
        <div className="ml-auto">
          <SambaExpandIcon isExpanded={isExpanded} />
        </div>
      </SambaCardHeader>
      <SambaCardContent isExpanded={isExpanded}>
        {content && (
          <div
            className="prose prose-sm dark:prose-invert max-w-none cursor-text"
            onClick={(e) => e.stopPropagation()}
          >
            <VanillaMarkdownParser content={content} />
          </div>
        )}
      </SambaCardContent>
    </SambaCard>
  );
}
