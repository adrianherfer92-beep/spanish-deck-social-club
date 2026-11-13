import { useEffect, useRef } from "react";

/** Suena un "ding" y parpadea el título de la pestaña cuando pasa a ser tu turno. */
export function useTurnAlert(myTurn: boolean) {
  const prev = useRef(false);
  useEffect(() => {
    if (myTurn && !prev.current) {
      try {
        const ctx = new AudioContext();
        [880, 1320].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.15);
          g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.15 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.15 + 0.3);
          o.connect(g).connect(ctx.destination);
          o.start(ctx.currentTime + i * 0.15);
          o.stop(ctx.currentTime + i * 0.15 + 0.32);
        });
      } catch {}
    }
    prev.current = myTurn;
    if (!myTurn || !document.hidden) return;
    const original = document.title;
    let on = false;
    const id = setInterval(() => {
      on = !on;
      document.title = on ? "🃏 ¡Te toca!" : original;
    }, 1000);
    const stop = () => {
      if (!document.hidden) {
        clearInterval(id);
        document.title = original;
      }
    };
    document.addEventListener("visibilitychange", stop);
    return () => {
      clearInterval(id);
      document.title = original;
      document.removeEventListener("visibilitychange", stop);
    };
  }, [myTurn]);
}
