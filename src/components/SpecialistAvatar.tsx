import { cn } from "@/lib/utils";
import type { SpecialistAgent } from "@/lib/specialist_agents";

const SIZE = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-11 w-11",
} as const;

type Size = keyof typeof SIZE;

/**
 * Retrato geométrico por especialista — cada um tem cara própria (cabelo,
 * acessório, paleta), para o dev reconhecer quem está recomendando.
 */
export function SpecialistAvatar({
  agent,
  size = "md",
  className,
}: {
  agent: SpecialistAgent;
  size?: Size;
  className?: string;
}) {
  const label = `${agent.persona}, ${agent.name}`;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-full ring-2 ring-background",
        SIZE[size],
        className,
      )}
      role="img"
      aria-label={label}
      title={label}
    >
      <Portrait id={agent.portrait} />
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
        <SpecialistAvatar key={agent.id} agent={agent} size={size} />
      ))}
    </span>
  );
}

function Portrait({ id }: { id: string }) {
  switch (id) {
    case "architect":
      return (
        <Face bg="#312e81" skin="#f5d0c5" hair="#1e1b4b" accessory="glasses" />
      );
    case "cybersec":
      return (
        <Face bg="#14532d" skin="#d4b48c" hair="#111827" accessory="hood" />
      );
    case "ux-ui":
      return (
        <Face bg="#9d174d" skin="#f8d7c4" hair="#7c2d12" accessory="brush" />
      );
    case "quality":
      return (
        <Face bg="#115e59" skin="#f3c6a8" hair="#44403c" accessory="goggles" />
      );
    case "performance":
      return (
        <Face bg="#9a3412" skin="#e8b895" hair="#292524" accessory="bolt" />
      );
    case "enterprise":
      return (
        <Face bg="#1e3a5f" skin="#e6c2a8" hair="#57534e" accessory="tie" />
      );
    case "pm":
      return (
        <Face bg="#c2410c" skin="#f2c7a4" hair="#78350f" accessory="board" />
      );
    case "reviewer":
      return (
        <Face bg="#44403c" skin="#efccb0" hair="#1c1917" accessory="lens" />
      );
    case "mobile":
      return (
        <Face bg="#0e7490" skin="#f0c9b0" hair="#0f172a" accessory="phone" />
      );
    case "devops":
      return (
        <Face bg="#1e40af" skin="#e2b48a" hair="#334155" accessory="headset" />
      );
    default:
      return (
        <Face bg="#334155" skin="#e8c4a8" hair="#1e293b" accessory="glasses" />
      );
  }
}

type Accessory =
  | "glasses"
  | "hood"
  | "brush"
  | "goggles"
  | "bolt"
  | "tie"
  | "board"
  | "lens"
  | "phone"
  | "headset";

function Face({
  bg,
  skin,
  hair,
  accessory,
}: {
  bg: string;
  skin: string;
  hair: string;
  accessory: Accessory;
}) {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
      <rect width="64" height="64" fill={bg} />
      {accessory === "hood" && (
        <path d="M8 62 V28 C8 10 56 10 56 28 V62" fill={hair} />
      )}
      <ellipse cx="32" cy="40" rx="16" ry="18" fill={skin} />
      {accessory !== "hood" && (
        <path
          d="M16 30 C18 12 46 12 48 30 L46 22 C40 8 24 8 18 22 Z"
          fill={hair}
        />
      )}
      <circle cx="24" cy="38" r="2.2" fill="#1f2937" />
      <circle cx="40" cy="38" r="2.2" fill="#1f2937" />
      <path
        d="M28 46 C31 49 33 49 36 46"
        fill="none"
        stroke="#9a3412"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {accessory === "glasses" && (
        <>
          <rect
            x="17"
            y="34"
            width="12"
            height="8"
            rx="2"
            fill="none"
            stroke="#c7d2fe"
            strokeWidth="1.8"
          />
          <rect
            x="35"
            y="34"
            width="12"
            height="8"
            rx="2"
            fill="none"
            stroke="#c7d2fe"
            strokeWidth="1.8"
          />
          <path d="M29 38 H35" stroke="#c7d2fe" strokeWidth="1.6" />
        </>
      )}
      {accessory === "goggles" && (
        <rect
          x="16"
          y="33"
          width="32"
          height="10"
          rx="4"
          fill="none"
          stroke="#99f6e4"
          strokeWidth="2"
        />
      )}
      {accessory === "brush" && (
        <g transform="translate(46 10)">
          <rect x="0" y="8" width="3" height="16" rx="1" fill="#fde68a" />
          <path d="M-1 8 H4 L2 0 L0 0 Z" fill="#fb7185" />
        </g>
      )}
      {accessory === "bolt" && (
        <path d="M42 8 L34 24 H40 L32 40 L48 22 H40 Z" fill="#fbbf24" />
      )}
      {accessory === "tie" && (
        <path d="M28 56 L32 48 L36 56 L32 62 Z" fill="#f8fafc" />
      )}
      {accessory === "board" && (
        <g transform="translate(44 12)">
          <rect width="12" height="16" rx="1.5" fill="#fff7ed" />
          <rect x="2" y="4" width="8" height="1.4" fill="#c2410c" />
          <rect x="2" y="8" width="8" height="1.4" fill="#c2410c" />
        </g>
      )}
      {accessory === "lens" && (
        <circle
          cx="42"
          cy="38"
          r="8"
          fill="none"
          stroke="#e7e5e4"
          strokeWidth="2"
        />
      )}
      {accessory === "phone" && (
        <g transform="translate(46 14)">
          <rect width="10" height="16" rx="2" fill="#ecfeff" />
          <rect x="2" y="3" width="6" height="8" fill="#22d3ee" />
        </g>
      )}
      {accessory === "headset" && (
        <>
          <path
            d="M16 30 C16 18 48 18 48 30"
            fill="none"
            stroke="#93c5fd"
            strokeWidth="3"
          />
          <rect x="10" y="30" width="6" height="10" rx="2" fill="#93c5fd" />
          <rect x="48" y="30" width="6" height="10" rx="2" fill="#93c5fd" />
        </>
      )}
    </svg>
  );
}
