import { describe, expect, it } from "vitest";
import { chatTextSchema, chatAvailable, CHAT_COOLDOWN_MS, CHAT_RETENTION_DAYS } from "@/lib/room-chat";

describe("chat privado de la mesa", () => {
  it("permite conversar antes, durante y después, pero no en mesas eliminadas", () => {
    expect(chatAvailable("lobby")).toBe(true);
    expect(chatAvailable("playing")).toBe(true);
    expect(chatAvailable("finished")).toBe(true);
    expect(chatAvailable("cancelled")).toBe(false);
  });
  it("acepta hasta 500 caracteres y rechaza mensajes vacíos o demasiado largos", () => {
    expect(chatTextSchema.parse("  Hola  ")).toBe("Hola");
    expect(chatTextSchema.safeParse(" ").success).toBe(false);
    expect(chatTextSchema.safeParse("a".repeat(500)).success).toBe(true);
    expect(chatTextSchema.safeParse("a".repeat(501)).success).toBe(false);
  });
  it("mantiene el intervalo de dos segundos entre envíos", () => {
    expect(CHAT_COOLDOWN_MS).toBe(2000);
  });
  it("limita el historial a siete días", () => {
    expect(CHAT_RETENTION_DAYS).toBe(7);
  });
});