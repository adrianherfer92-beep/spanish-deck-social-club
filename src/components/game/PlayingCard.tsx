import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { rankOf, suitOf, cardName, type Suit } from "@/lib/games/cards";

/* Baraja española dibujada a mano en SVG (diseño propio, libre de derechos),
   inspirada en la tradición del naipe español: marco con "pausas"
   (0 oros, 1 copas, 2 espadas, 3 bastos). */

const SUIT_COLOR: Record<Suit, string> = {
  o: "var(--suit-oros)",
  c: "var(--suit-copas)",
  e: "var(--suit-espadas)",
  b: "var(--suit-bastos)",
};

function SuitSymbol({ suit, x, y, size = 1 }: { suit: Suit; x: number; y: number; size?: number }) {
  const col = SUIT_COLOR[suit];
  const ink = "var(--paper-ink)";
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      {suit === "o" && (
        <>
          <circle r="7" fill={col} stroke={ink} strokeWidth="0.8" />
          <circle r="4.6" fill="none" stroke={ink} strokeWidth="0.6" />
          <path d="M0 -2.4 L0.7 -0.7 L2.4 0 L0.7 0.7 L0 2.4 L-0.7 0.7 L-2.4 0 L-0.7 -0.7Z" fill={ink} />
        </>
      )}
      {suit === "c" && (
        <path
          d="M-6 -7 H6 C6 -1 3 1.5 1 2 V5 H3.5 V7 H-3.5 V5 H-1 V2 C-3 1.5 -6 -1 -6 -7Z"
          fill={col}
          stroke={ink}
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      )}
      {suit === "e" && (
        <g stroke={ink} strokeWidth="0.7">
          <path d="M0 -9 L1.5 -6 V4 H-1.5 V-6Z" fill={col} />
          <rect x="-5" y="4" width="10" height="1.8" rx="0.8" fill="var(--suit-oros)" />
          <rect x="-1" y="5.8" width="2" height="3" fill="var(--suit-oros)" />
        </g>
      )}
      {suit === "b" && (
        <g stroke={ink} strokeWidth="0.7">
          <path d="M-1.6 9 C-2 3 -3.6 -3 -2.8 -7 C-2.2 -9.5 2.4 -9.5 2.8 -7 C3.6 -3 2 3 1.6 9Z" fill={col} />
          <circle cx="-2.6" cy="-2" r="0.9" fill="var(--suit-oros)" />
          <circle cx="2.5" cy="1.5" r="0.9" fill="var(--suit-oros)" />
        </g>
      )}
    </g>
  );
}

const PIPS: Record<number, [number, number][]> = {
  1: [[30, 45]],
  2: [[30, 26], [30, 64]],
  3: [[30, 22], [30, 45], [30, 68]],
  4: [[20, 28], [40, 28], [20, 62], [40, 62]],
  5: [[20, 26], [40, 26], [30, 45], [20, 64], [40, 64]],
  6: [[20, 24], [40, 24], [20, 45], [40, 45], [20, 66], [40, 66]],
  7: [[20, 22], [40, 22], [30, 34], [20, 47], [40, 47], [20, 68], [40, 68]],
};

function Figure({ suit, rank }: { suit: Suit; rank: number }) {
  const col = SUIT_COLOR[suit];
  const robe = rank === 12 ? "var(--suit-copas)" : rank === 11 ? "var(--suit-espadas)" : "var(--suit-bastos)";
  return (
    <g stroke="var(--paper-ink)" strokeWidth="0.7">
      {rank === 11 && <path d="M14 76 C14 62 20 58 30 58 C42 58 47 64 47 76Z" fill="var(--paper)" />}
      <path d="M21 76 L24 44 H36 L39 76Z" fill={robe} />
      <circle cx="30" cy="36" r="6" fill="var(--paper)" />
      {rank === 12 && <path d="M24 31 L25 26 L28 29 L30 25 L32 29 L35 26 L36 31Z" fill="var(--suit-oros)" />}
      {rank === 11 && <path d="M24 32 C26 28 34 28 36 32Z" fill="var(--suit-copas)" />}
      {rank === 10 && <path d="M24 33 C25 29 35 29 36 33 L35 34 H25Z" fill="var(--suit-espadas)" />}
      <rect x="24" y="52" width="12" height="2" fill="var(--suit-oros)" stroke="none" />
      <SuitSymbol suit={suit} x={suit === "o" || suit === "c" ? 42 : 43} y={suit === "o" || suit === "c" ? 48 : 46} size={0.85} />
      <circle cx="30" cy="36" r="6" fill="none" stroke={col} strokeWidth="0.4" />
    </g>
  );
}

export function PlayingCard({
  card,
  faceDown,
  size = "md",
  selected,
  disabled,
  dim,
  onClick,
  className,
  style,
}: {
  card?: string | null;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  disabled?: boolean;
  dim?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const w = size === "sm" ? "w-10" : size === "lg" ? "w-24" : "w-16";
  const hidden = faceDown || !card;
  const suit = card ? suitOf(card) : "o";
  const rank = card ? rankOf(card) : 1;
  const gaps = { o: 0, c: 1, e: 2, b: 3 }[suit];
  const gapXs = gaps === 1 ? [30] : gaps === 2 ? [24, 36] : gaps === 3 ? [20, 30, 40] : [];
  const Tag = onClick ? Button : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={hidden || !card ? "Carta boca abajo" : cardName(card)}
      aria-pressed={onClick ? !!selected : undefined}
      style={style}
      className={cn(
        "relative h-auto shrink-0 rounded-md bg-transparent p-0 shadow-card select-none hover:bg-transparent disabled:opacity-100",
        w,
        onClick && !disabled && "playing-card-lift cursor-pointer ring-2 ring-accent ring-offset-2 ring-offset-background focus-visible:ring-4",
        selected && "-translate-y-3 ring-2 ring-accent",
        dim && "opacity-45",
        className,
      )}
    >
      <svg viewBox="0 0 60 90" className="block h-auto w-full">
        {hidden ? (
          <>
            <rect x="0.5" y="0.5" width="59" height="89" rx="4" fill="var(--paper)" stroke="var(--paper-ink)" />
            <rect x="4" y="4" width="52" height="82" rx="2" fill="var(--card-back)" />
            <g stroke="var(--suit-oros)" strokeWidth="0.6" opacity="0.7">
              {Array.from({ length: 12 }).map((_, i) => (
                <path key={i} d={`M4 ${4 + i * 8} L56 ${12 + i * 8}`} />
              ))}
            </g>
            <circle cx="30" cy="45" r="10" fill="var(--paper)" stroke="var(--suit-oros)" strokeWidth="1.2" />
            <text x="30" y="49.5" textAnchor="middle" fontSize="11" fontFamily="var(--font-display)" fill="var(--card-back)">
              T
            </text>
          </>
        ) : (
          <>
            <rect x="0.5" y="0.5" width="59" height="89" rx="4" fill="var(--paper)" stroke="var(--paper-ink)" />
            <rect x="4" y="4" width="52" height="82" rx="1.5" fill="none" stroke="var(--card-frame)" strokeWidth="1.2" />
            {gapXs.map((gx) => (
              <g key={gx} fill="var(--paper)">
                <rect x={gx - 2} y="3" width="4" height="2.5" />
                <rect x={gx - 2} y="84.5" width="4" height="2.5" />
              </g>
            ))}
            <text x="7" y="13" fontSize="8" fontWeight="700" fontFamily="var(--font-sans)" fill="var(--paper-ink)">
              {rank}
            </text>
            <text x="53" y="83" fontSize="8" fontWeight="700" textAnchor="end" fontFamily="var(--font-sans)" fill="var(--paper-ink)">
              {rank}
            </text>
            {rank <= 7 ? (
              PIPS[rank].map(([x, y], i) => <SuitSymbol key={i} suit={suit} x={x} y={y} size={rank === 1 ? 2.2 : rank <= 3 ? 1.1 : 0.95} />)
            ) : (
              <Figure suit={suit} rank={rank} />
            )}
          </>
        )}
      </svg>
      {onClick && !disabled && <span className="absolute -right-1 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground" aria-hidden="true"><Check className="h-3 w-3" /></span>}
    </Tag>
  );
}
