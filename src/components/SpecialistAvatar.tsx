import { cn } from "@/lib/utils";
import type { SpecialistAgent } from "@/lib/specialist_agents";
import { specialistPortraitSrc } from "@/lib/specialist_portraits";

const SIZE = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-11 w-11",
} as const;

type Size = keyof typeof SIZE;

/**
 * Retrato ilustrado de cada especialista (ícones gerados com Grok).
 * O recorte circular lê bem no chat, no diálogo e nas next-steps.
 */
export function SpecialistAvatar({
  agent,
  size = "md",
  className,
  decorative = false,
}: {
  agent: SpecialistAgent;
  size?: Size;
  className?: string;
  decorative?: boolean;
}) {
  const label = `${agent.persona}, ${agent.name}`;
  const src = specialistPortraitSrc(agent.portrait);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-full ring-2 ring-background",
        SIZE[size],
        className,
      )}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      title={label}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full scale-[1.06] object-cover"
          draggable={false}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-muted text-[10px] font-semibold">
          {agent.persona.slice(0, 1)}
        </span>
      )}
    </span>
  );
}

export function SpecialistAvatarStack({
  agents,
  size = "xs",
  max = 4,
  className,
}: {
  agents: SpecialistAgent[];
  size?: Size;
  max?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("flex items-center -space-x-1.5", className)}
      aria-hidden="true"
    >
      {agents.slice(0, max).map((agent) => (
        <SpecialistAvatar key={agent.id} agent={agent} size={size} decorative />
      ))}
    </span>
  );
}
