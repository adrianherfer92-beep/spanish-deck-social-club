import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { GameInfo } from "@/lib/games/info";

export function GameRulesDialog({ game, compact = false }: { game: GameInfo; compact?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={compact ? "ghost" : "outline"} size={compact ? "sm" : "default"} aria-label={`Reglas de ${game.name}`}>
          <BookOpen />{compact ? "Reglas" : "Leer las reglas"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="pr-7 font-display text-3xl">{game.name}</DialogTitle>
          <DialogDescription>{game.players} · {game.duration} · {game.complexity}</DialogDescription>
        </DialogHeader>
        <div className="max-w-[70ch] space-y-5">
          <div><h3 className="text-xl">Objetivo</h3><p className="mt-2">{game.objective}</p></div>
          <div><h3 className="text-xl">Cómo se juega</h3><ol className="mt-3 list-decimal space-y-3 pl-5">{game.rules.map(rule => <li key={rule}>{rule}</li>)}</ol></div>
          <div><h3 className="text-xl">Consejos de la casa</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">{game.tips.map(tip => <li key={tip}>{tip}</li>)}</ul></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}