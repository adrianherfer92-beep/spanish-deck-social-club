import { useMemo } from "react";
import { avatarDataUri } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export function PlayerAvatar({ seed, name, className }: { seed: string; name: string; className?: string }) {
  const src = useMemo(() => avatarDataUri(seed), [seed]);
  return <img src={src} alt={`Avatar de ${name}`} width={48} height={48} className={cn("h-12 w-12 shrink-0 rounded-full border border-border bg-secondary object-contain p-1", className)} />;
}