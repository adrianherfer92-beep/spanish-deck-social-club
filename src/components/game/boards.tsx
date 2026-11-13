import { useState, type ReactNode } from "react";
import { PlayingCard } from "./PlayingCard";
import { Button } from "@/components/ui/button";
import { SUIT_NAMES, RANKS, type Suit, cardName } from "@/lib/games/cards";
import { cn } from "@/lib/utils";

export type Player = { id: string; name: string; registered: boolean; host: boolean };
export type Act = (a: { type: string; card?: string; take?: string[] }) => Promise<void>;
interface BoardProps {
  view: any;
  mySeat: number;
  players: Player[];
  act: Act;
  busy: boolean;
}

export function Seats({ players, turn, counts, mySeat, extra }: { players: Player[]; turn?: number | null; counts?: number[]; mySeat: number; extra?: (i: number) => ReactNode }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {players.map((p, i) => (
        <div
          key={p.id}
          className={cn(
            "min-w-28 rounded-md border-2 px-3 py-2 text-center text-sm",
            turn === i ? "border-accent bg-secondary" : "border-border bg-card",
          )}
        >
          <div className="truncate font-semibold">
            {p.name}
            {i === mySeat && <span className="text-accent"> (tú)</span>}
          </div>
          {counts && <div className="text-xs text-muted-foreground">{counts[i]} cartas</div>}
          {extra?.(i)}
          {turn === i && <div className="text-[10px] uppercase tracking-widest text-accent">su turno</div>}
        </div>
      ))}
    </div>
  );
}

function Hand({ cards, playable, onPlay, selected, busy }: { cards: string[]; playable?: string[]; onPlay?: (c: string) => void; selected?: string | null; busy?: boolean }) {
  if (!cards.length) return <p className="text-center text-muted-foreground">Sin cartas en la mano.</p>;
  return (
    <div className="flex flex-wrap justify-center gap-1.5 pt-4">
      {cards.map((c, i) => {
        const can = !playable || playable.includes(c);
        return (
          <PlayingCard
            key={c}
            card={c}
            size="md"
            className="animate-deal"
            style={{ animationDelay: `${i * 30}ms` }}
            selected={selected === c}
            dim={!!playable && !can}
            disabled={busy || !can}
            onClick={onPlay ? () => onPlay(c) : undefined}
          />
        );
      })}
    </div>
  );
}

function TurnBanner({ mine, name }: { mine: boolean; name?: string }) {
  return (
    <p className={cn("text-center font-display text-2xl", mine ? "text-accent" : "text-muted-foreground")}>
      {mine ? "¡Te toca!" : `Turno de ${name ?? "…"}`}
    </p>
  );
}

/* ---------------- Cinquillo ---------------- */
export function CinquilloBoard({ view, mySeat, players, act, busy }: BoardProps) {
  const mine = view.turn === mySeat && view.winner === null;
  return (
    <div className="space-y-6">
      <Seats players={players} turn={view.winner === null ? view.turn : null} counts={view.counts} mySeat={mySeat} />
      <div className="felt-table space-y-3 rounded-xl p-4">
        {(view.suits as Suit[]).map((s) => {
          const row = view.table[s] as [number, number] | null;
          return (
            <div key={s} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs uppercase tracking-wider text-paper/80">{SUIT_NAMES[s]}</span>
              <div className="flex gap-1 overflow-x-auto">
                {RANKS.map((r, idx) => {
                  const on = row && idx >= row[0] && idx <= row[1];
                  return on ? (
                    <PlayingCard key={r} card={`${s}${r}`} size="sm" />
                  ) : (
                    <div key={r} className="w-10 shrink-0 rounded-md border border-dashed border-paper/25" style={{ aspectRatio: "60/90" }} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {!view.over && (view.winner === null || view.winner === undefined) && <TurnBanner mine={mine} name={players[view.turn]?.name} />}
      <Hand cards={view.hand} playable={mine ? view.playable : []} busy={busy} onPlay={mine ? (c) => act({ type: "play", card: c }) : undefined} />
      {mine && view.playable.length === 0 && (
        <div className="text-center">
          <Button onClick={() => act({ type: "pass" })} disabled={busy}>No puedo jugar: paso</Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Burro ---------------- */
export function BurroBoard({ view, mySeat, players, act, busy }: BoardProps) {
  const mine = view.turn === mySeat && !view.over;
  const playable = mine ? (view.ledSuit ? view.hand.filter((c: string) => c[0] === view.ledSuit) : view.hand) : [];
  return (
    <div className="space-y-6">
      <Seats
        players={players}
        turn={view.over ? null : view.turn}
        counts={view.counts}
        mySeat={mySeat}
        extra={(i) =>
          view.finished.includes(i) ? (
            <div className="text-xs text-accent">Terminó {view.finished.indexOf(i) + 1}º</div>
          ) : view.passed.includes(i) ? (
            <div className="text-xs text-muted-foreground">Pasa</div>
          ) : null
        }
      />
      <div className="felt-table flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl p-5">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <PlayingCard faceDown size="md" />
            <div className="mt-1 text-xs text-paper/80">Mazo: {view.deckCount}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {view.trick.length ? (
              view.trick.map((t: { seat: number; card: string }) => (
                <div key={t.card} className="text-center">
                  <PlayingCard card={t.card} size="md" className="animate-deal" />
                  <div className="mt-1 max-w-16 truncate text-xs text-paper/80">{players[t.seat]?.name}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-paper/80">
                {view.lastWinner !== null ? `${players[view.lastWinner]?.name} ganó la baza y sale.` : "Mesa vacía: sale quien tiene el turno."}
              </p>
            )}
          </div>
        </div>
        {view.ledSuit && <p className="text-sm text-paper">Se juega a <b>{SUIT_NAMES[view.ledSuit as Suit]}</b></p>}
      </div>
      {!view.over && (view.winner === null || view.winner === undefined) && <TurnBanner mine={mine} name={players[view.turn]?.name} />}
      <Hand cards={view.hand} playable={playable} busy={busy} onPlay={mine ? (c) => act({ type: "play", card: c }) : undefined} />
      {mine && !view.canFollow && (
        <div className="text-center">
          {view.deckCount > 0 ? (
            <Button onClick={() => act({ type: "draw" })} disabled={busy}>No tengo {SUIT_NAMES[view.ledSuit as Suit]}: robo</Button>
          ) : (
            <Button onClick={() => act({ type: "pass" })} disabled={busy}>Mazo vacío: paso</Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Siete y medio ---------------- */
export function SieteBoard({ view, mySeat, players, act, busy }: BoardProps) {
  const mine = view.turn === mySeat && !view.over;
  const myValue = view.values[mySeat];
  return (
    <div className="space-y-6">
      <div className="felt-table grid gap-4 rounded-xl p-5 sm:grid-cols-2">
        {players.map((p, i) => (
          <div key={p.id} className={cn("rounded-lg border-2 p-3", view.turn === i && !view.over ? "border-accent" : "border-paper/20")}>
            <div className="flex items-center justify-between text-sm text-paper">
              <span className="font-semibold">{p.name}{i === mySeat && " (tú)"}</span>
              <span>
                {view.values[i] !== null ? (
                  <b className={view.values[i] > 7.5 ? "text-destructive" : "text-accent"}>{fmt(view.values[i])}{view.values[i] > 7.5 && " · se pasó"}</b>
                ) : view.standing[i] ? "Plantado" : "…"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(view.hands[i] as (string | null)[]).map((c, k) => (
                <PlayingCard key={k} card={c} faceDown={!c} size="sm" className="animate-deal" />
              ))}
            </div>
          </div>
        ))}
      </div>
      {mySeat >= 0 && !view.over && (
        <p className="text-center">Llevas <b className="font-display text-3xl text-accent">{fmt(myValue)}</b></p>
      )}
      {!view.over && (view.winner === null || view.winner === undefined) && <TurnBanner mine={mine} name={players[view.turn]?.name} />}
      {mine && (
        <div className="flex justify-center gap-3">
          <Button onClick={() => act({ type: "draw" })} disabled={busy}>Pedir carta</Button>
          <Button variant="secondary" onClick={() => act({ type: "stand" })} disabled={busy}>Me planto</Button>
        </div>
      )}
    </div>
  );
}
const fmt = (v: number | null) => (v === null ? "?" : Number.isInteger(v) ? String(v) : `${Math.floor(v)}½`);

/* ---------------- Escoba ---------------- */
const ev = (c: string) => {
  const r = parseInt(c.slice(1), 10);
  return r <= 7 ? r : r - 2;
};
export function EscobaBoard({ view, mySeat, players, act, busy }: BoardProps) {
  const mine = view.turn === mySeat && !view.over;
  const [card, setCard] = useState<string | null>(null);
  const [take, setTake] = useState<string[]>([]);
  const sum = (card ? ev(card) : 0) + take.reduce((t, c) => t + ev(c), 0);
  const play = async (withTake: boolean) => {
    if (!card) return;
    await act({ type: "play", card, take: withTake ? take : [] });
    setCard(null);
    setTake([]);
  };
  return (
    <div className="space-y-6">
      <Seats
        players={players}
        turn={view.over ? null : view.turn}
        counts={view.counts}
        mySeat={mySeat}
        extra={(i) => (
          <div className="text-xs text-muted-foreground">
            {view.capturedCounts[i]} recogidas · {view.escobas[i]} escobas
          </div>
        )}
      />
      <div className="felt-table rounded-xl p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-paper/80">
          <span>Mazo: {view.deckCount}</span>
          {view.lastMove && (
            <span>
              {players[view.lastMove.seat]?.name} echó {cardName(view.lastMove.card)}
              {view.lastMove.took.length > 0 && ` y se llevó ${view.lastMove.took.length}`}
              {view.lastMove.escoba && " — ¡ESCOBA!"}
            </span>
          )}
        </div>
        <div className="flex min-h-28 flex-wrap justify-center gap-2">
          {view.table.length === 0 && <p className="self-center text-paper/70">Mesa limpia</p>}
          {view.table.map((c: string) => (
            <PlayingCard
              key={c}
              card={c}
              size="md"
              selected={take.includes(c)}
              disabled={!mine || busy}
              onClick={mine ? () => setTake((t) => (t.includes(c) ? t.filter((x) => x !== c) : [...t, c])) : undefined}
            />
          ))}
        </div>
      </div>
      {!view.over && (view.winner === null || view.winner === undefined) && <TurnBanner mine={mine} name={players[view.turn]?.name} />}
      {mine && (
        <p className="text-center text-sm text-muted-foreground">
          Elige una carta de tu mano y las de la mesa que quieras sumar. Suma actual: <b className={sum === 15 ? "text-accent" : ""}>{sum}</b> / 15
        </p>
      )}
      <Hand cards={view.hand} busy={busy} selected={card} onPlay={mine ? (c) => setCard(card === c ? null : c) : undefined} />
      {mine && card && (
        <div className="flex justify-center gap-3">
          <Button onClick={() => play(true)} disabled={busy || take.length === 0 || sum !== 15}>Llevarme ({sum})</Button>
          <Button variant="secondary" onClick={() => play(false)} disabled={busy}>Dejar en la mesa</Button>
        </div>
      )}
    </div>
  );
}

export const BOARDS: Record<string, (p: BoardProps) => ReactNode> = {
  cinquillo: CinquilloBoard,
  burro: BurroBoard,
  "siete-y-medio": SieteBoard,
  escoba: EscobaBoard,
};
