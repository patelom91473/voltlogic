import type { ComponentType } from "@/types/circuit";

const S = 28;

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0">
      {children}
    </svg>
  );
}

export function PaletteIcon({ type }: { type: ComponentType }) {
  switch (type) {
    case "voltage_source":
      return (
        <Icon>
          <circle cx="14" cy="14" r="10" fill="none" stroke="#22d3ee" strokeWidth="1.5" />
          <line x1="10" y1="11" x2="10" y2="17" stroke="#22d3ee" strokeWidth="1" />
          <line x1="7" y1="14" x2="13" y2="14" stroke="#22d3ee" strokeWidth="1" />
          <line x1="15" y1="14" x2="21" y2="14" stroke="#22d3ee" strokeWidth="1" />
        </Icon>
      );
    case "ground":
      return (
        <Icon>
          <line x1="14" y1="4" x2="14" y2="12" stroke="#71717a" strokeWidth="1.5" />
          <line x1="6" y1="12" x2="22" y2="12" stroke="#71717a" strokeWidth="1.5" />
          <line x1="9" y1="17" x2="19" y2="17" stroke="#71717a" strokeWidth="1.5" />
          <line x1="12" y1="22" x2="16" y2="22" stroke="#71717a" strokeWidth="1.5" />
        </Icon>
      );
    case "resistor":
      return (
        <Icon>
          <path d="M2,14 L6,14 L8,6 L12,22 L16,6 L20,22 L22,14 L26,14"
            fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round" />
        </Icon>
      );
    case "capacitor":
      return (
        <Icon>
          <line x1="2" y1="14" x2="11" y2="14" stroke="#71717a" strokeWidth="1.5" />
          <line x1="11" y1="5" x2="11" y2="23" stroke="#38bdf8" strokeWidth="2" />
          <line x1="17" y1="5" x2="17" y2="23" stroke="#38bdf8" strokeWidth="2" />
          <line x1="17" y1="14" x2="26" y2="14" stroke="#71717a" strokeWidth="1.5" />
        </Icon>
      );
    case "inductor":
      return (
        <Icon>
          <path d="M2,18 C2,10 8,10 8,18 C8,10 14,10 14,18 C14,10 20,10 20,18 C20,10 26,10 26,18"
            fill="none" stroke="#a78bfa" strokeWidth="1.5" />
        </Icon>
      );
    case "led":
      return (
        <Icon>
          <polygon points="8,6 8,22 22,14" fill="none" stroke="#4ade80" strokeWidth="1.5" />
          <line x1="22" y1="6" x2="22" y2="22" stroke="#4ade80" strokeWidth="1.5" />
          <line x1="18" y1="4" x2="22" y2="0" stroke="#4ade80" strokeWidth="1" />
          <line x1="22" y1="3" x2="26" y2="0" stroke="#4ade80" strokeWidth="1" />
        </Icon>
      );
    case "func_gen":
      return (
        <Icon>
          <circle cx="14" cy="14" r="10" fill="none" stroke="#22d3ee" strokeWidth="1.5" />
          <path d="M8,14 C10,6 12,6 14,14 C16,22 18,22 20,14" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />
        </Icon>
      );
    case "momentary_button":
      return (
        <Icon>
          <rect x="3" y="6" width="22" height="16" rx="4" fill="none" stroke="#f97316" strokeWidth="1.5" />
          <rect x="8" y="10" width="12" height="8" rx="2" fill="#f97316" opacity="0.3" />
          <line x1="14" y1="8" x2="14" y2="6" stroke="#f97316" strokeWidth="1.2" />
        </Icon>
      );
    case "logic_switch":
      return (
        <Icon>
          <rect x="3" y="6" width="22" height="16" rx="8" fill="none" stroke="#22d3ee" strokeWidth="1.5" />
          <circle cx="18" cy="14" r="5" fill="#22d3ee" opacity="0.3" />
          <circle cx="18" cy="14" r="3" fill="#22d3ee" />
        </Icon>
      );
    case "and_gate":
      return (
        <Icon>
          <path d="M6,4 L16,4 Q24,4 24,14 Q24,24 16,24 L6,24 Z"
            fill="none" stroke="#34d399" strokeWidth="1.5" />
        </Icon>
      );
    case "or_gate":
      return (
        <Icon>
          <path d="M6,4 Q12,14 6,24 Q16,24 24,14 Q16,4 6,4 Z"
            fill="none" stroke="#60a5fa" strokeWidth="1.5" />
        </Icon>
      );
    case "not_gate":
      return (
        <Icon>
          <path d="M6,4 L6,24 L22,14 Z" fill="none" stroke="#fb7185" strokeWidth="1.5" />
          <circle cx="24" cy="14" r="2.5" fill="none" stroke="#fb7185" strokeWidth="1.2" />
        </Icon>
      );
    case "nand_gate":
      return (
        <Icon>
          <path d="M6,4 L16,4 Q24,4 24,14 Q24,24 16,24 L6,24 Z"
            fill="none" stroke="#a78bfa" strokeWidth="1.5" />
          <circle cx="26" cy="14" r="2.5" fill="none" stroke="#a78bfa" strokeWidth="1.2" />
        </Icon>
      );
    case "nor_gate":
      return (
        <Icon>
          <path d="M6,4 Q12,14 6,24 Q16,24 24,14 Q16,4 6,4 Z"
            fill="none" stroke="#f97316" strokeWidth="1.5" />
          <circle cx="26" cy="14" r="2.5" fill="none" stroke="#f97316" strokeWidth="1.2" />
        </Icon>
      );
    case "xor_gate":
      return (
        <Icon>
          <path d="M4,4 Q8,14 4,24" fill="none" stroke="#facc15" strokeWidth="1.2" />
          <path d="M6,4 Q12,14 6,24 Q16,24 24,14 Q16,4 6,4 Z"
            fill="none" stroke="#facc15" strokeWidth="1.5" />
        </Icon>
      );
    case "potentiometer":
      return (
        <Icon>
          <path d="M2,14 L6,14 L8,8 L12,20 L16,8 L20,20 L22,14 L26,14"
            fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="14" y1="2" x2="14" y2="8" stroke="#71717a" strokeWidth="1.5" />
          <polygon points="11,8 14,12 17,8" fill="#fbbf24" stroke="none" />
        </Icon>
      );
    case "npn_transistor":
      return (
        <Icon>
          <circle cx="16" cy="14" r="10" fill="none" stroke="#f472b6" strokeWidth="1.2" />
          <line x1="2" y1="14" x2="10" y2="14" stroke="#71717a" strokeWidth="1.5" />
          <line x1="10" y1="8" x2="10" y2="20" stroke="#f472b6" strokeWidth="2" />
          <line x1="10" y1="10" x2="22" y2="4" stroke="#f472b6" strokeWidth="1.5" />
          <line x1="10" y1="18" x2="22" y2="24" stroke="#f472b6" strokeWidth="1.5" />
          <polygon points="18,22 22,24 20,18" fill="#f472b6" />
        </Icon>
      );
    case "d_flipflop":
      return (
        <Icon>
          <rect x="4" y="3" width="20" height="22" rx="2" fill="none" stroke="#a78bfa" strokeWidth="1.5" />
          <text x="8" y="12" fill="#a1a1aa" fontSize="5.5" fontFamily="monospace">D</text>
          <text x="17" y="12" fill="#a1a1aa" fontSize="5.5" fontFamily="monospace">Q</text>
          <polygon points="4,18 8,21 4,24" fill="none" stroke="#a1a1aa" strokeWidth="1" />
          <circle cx="14" cy="14" r="1.5" fill="#a78bfa" />
        </Icon>
      );
    case "logic_led":
      return (
        <Icon>
          <line x1="2" y1="14" x2="10" y2="14" stroke="#71717a" strokeWidth="1.5" />
          <circle cx="18" cy="14" r="8" fill="none" stroke="#4ade80" strokeWidth="1.5" />
          <circle cx="18" cy="14" r="4" fill="#4ade80" opacity="0.3" />
        </Icon>
      );
    case "voltmeter":
      return (
        <Icon>
          <circle cx="14" cy="14" r="10" fill="none" stroke="#22d3ee" strokeWidth="1.5" />
          <text x="14" y="18" textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="bold" fontFamily="monospace">V</text>
        </Icon>
      );
    case "ammeter":
      return (
        <Icon>
          <circle cx="14" cy="14" r="10" fill="none" stroke="#f97316" strokeWidth="1.5" />
          <text x="14" y="18" textAnchor="middle" fill="#f97316" fontSize="11" fontWeight="bold" fontFamily="monospace">A</text>
        </Icon>
      );
    case "timer_555":
      return (
        <Icon>
          <rect x="4" y="4" width="20" height="20" rx="2"
            fill="none" stroke="#71717a" strokeWidth="1.5" />
          <path d="M12,4 A3,3 0 0,0 16,4" fill="none" stroke="#71717a" strokeWidth="1" />
          <text x="14" y="17" textAnchor="middle" fill="#a1a1aa" fontSize="6"
            fontFamily="monospace">555</text>
        </Icon>
      );
    case "seven_segment":
      return (
        <Icon>
          <rect x="4" y="2" width="20" height="24" rx="2"
            fill="#0a0a0f" stroke="#27272a" strokeWidth="1" />
          <path d="M9,6 L19,6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          <path d="M20,7 L20,13" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          <path d="M20,15 L20,21" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          <path d="M9,22 L19,22" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          <path d="M8,15 L8,21" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          <path d="M8,7 L8,13" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          <path d="M9,14 L19,14" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        </Icon>
      );
    default:
      return null;
  }
}
