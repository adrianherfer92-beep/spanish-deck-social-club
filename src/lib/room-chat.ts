import { z } from "zod";
import type { Gif } from "@/lib/gifs";

export const CHAT_MAX_LENGTH = 500;
export const CHAT_COOLDOWN_MS = 2_000;
export const CHAT_RETENTION_DAYS = 7;
export const chatTextSchema = z.string().trim().min(1, "Escribe un mensaje").max(CHAT_MAX_LENGTH, "Máximo 500 caracteres");
export const chatAvailable = (status: string, member: boolean) => member && ["lobby", "playing", "finished"].includes(status);
export type ChatMessage = { id: number; playerId: string | null; name: string; text: string | null; gif: Gif | null; sentAt: string };