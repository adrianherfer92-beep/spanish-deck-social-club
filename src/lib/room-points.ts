import { pointsForPosition } from "./games/cards";
import { ENGINES } from "./games";

export function exitPenalty(playing: boolean, deleting: boolean, registered: boolean) {
  return playing && registered ? (deleting ? 1 : 2) : 0;
}

export function autoMove(engine: (typeof ENGINES)[string], state: any, seat: number) {
  let s = state;
  for (let guard = 0; guard < 60; guard++) {
    const view: any = engine.view(s, seat);
    const tries = [{ type: "pass" }, { type: "stand" }, ...(view.hand ?? []).map((card: string) => ({ type: "play", card })), { type: "draw" }];
    let moved = false;
    for (const action of tries) {
      try {
        s = engine.move(s, seat, action);
        moved = true;
        if (action.type !== "draw") return s;
        break;
      } catch {}
    }
    if (!moved) return null;
  }
  return null;
}

/** Keep departed seats stable and play their turns without exposing their cards. */
export function advanceDeparted(engine: (typeof ENGINES)[string], state: any, players: { left_at: string | null }[]) {
  let next = state;
  for (let guard = 0; guard < 1000 && !engine.ranking(next); guard++) {
    const turn = next?.turn;
    if (typeof turn !== "number" || !players[turn]?.left_at) return next;
    const moved = autoMove(engine, next, turn);
    if (!moved) throw new Error("No se pudo avanzar el turno abandonado");
    next = moved;
  }
  return next;
}

export function resultRows(ranking: number[], players: { user_id: string | null; name: string; left_at: string | null }[]) {
  const ordered = [...ranking.filter(i => !players[i].left_at), ...ranking.filter(i => players[i].left_at)];
  return ordered.map((seat, i) => {
    const p = players[seat];
    return { user_id: p.user_id, name: p.name, position: i + 1, points: p.user_id && !p.left_at ? pointsForPosition(i + 1) : 0 };
  });
}