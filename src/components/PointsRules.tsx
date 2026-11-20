import { pointsForPosition } from "@/lib/games/cards";

export function PointsRules() {
  return (
    <section aria-labelledby="points-title" className="mt-10 border-t border-border py-8">
      <h2 id="points-title" className="text-3xl">Sistema de puntos</h2>
      <dl className="mt-5 grid max-w-md grid-cols-4 gap-2 border-y border-border py-4">
        {[1, 2, 3, 4].map(position => <div key={position}><dt className="text-sm text-muted-foreground">{position === 4 ? "Resto" : `${position}º puesto`}</dt><dd className="font-display text-3xl text-accent">+{pointsForPosition(position)}</dd></div>)}
      </dl>
      <ul className="mt-5 max-w-[70ch] list-disc space-y-3 pl-5 text-sm text-muted-foreground">
        <li>El creador pierde <b className="text-foreground">1 punto</b> si elimina una partida en progreso. Los demás no pierden puntos por esa eliminación.</li>
        <li>Si otro jugador abandona una partida en progreso, pierde <b className="text-foreground">2 puntos</b> y no recibe puntos al terminar. Sus turnos se completan automáticamente.</li>
        <li>Salir antes del reparto o después de terminar no tiene penalización. Los invitados no ganan ni pierden puntos.</li>
        <li>Los puntos se acumulan en tu perfil y pueden quedar en negativo.</li>
      </ul>
      <p className="mt-5 max-w-[70ch] border-l-2 border-accent pl-4 text-sm"><b>Cerrar la pestaña no equivale a abandonar.</b> Puedes volver a la mesa y continuar.</p>
    </section>
  );
}