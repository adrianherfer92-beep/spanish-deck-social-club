import { describe, expect, it } from "vitest";
import { avatarDataUri, avatarSeed } from "@/lib/avatars";

describe("avatares privados de DiceBear", () => {
  it("conserva el avatar del mismo identificador", () => {
    expect(avatarDataUri(avatarSeed("player-123"))).toBe(avatarDataUri(avatarSeed("player-123")));
    expect(avatarSeed("player-123")).not.toBe(avatarSeed("player-456"));
  });
  it("genera imágenes locales sin solicitudes externas", () => {
    const uri = avatarDataUri(avatarSeed("player-123"));
    expect(uri.startsWith("data:image/svg+xml;")).toBe(true);
    expect(decodeURIComponent(uri)).toContain("<svg");
  });
  it("no incluye el identificador original en la semilla", () => {
    expect(avatarSeed("550e8400-e29b-41d4-a716-446655440000")).toMatch(/^timba-[a-z0-9]+$/);
  });
});