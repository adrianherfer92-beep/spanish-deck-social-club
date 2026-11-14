import { describe, expect, it } from "vitest";
import { avatarDataUri, avatarSeed, randomAvatarSeed, resolvedAvatarSeed } from "@/lib/avatars";

describe("avatares privados de DiceBear", () => {
  it("shuffle genera otra imagen que se conserva al elegirla", () => {
    const first = randomAvatarSeed();
    const next = randomAvatarSeed();
    expect(next).not.toBe(first);
    expect(avatarDataUri(next)).not.toBe(avatarDataUri(first));
    expect(resolvedAvatarSeed("player-123", next)).toBe(next);
  });
  it("perfiles sin elección conservan el avatar automático", () => {
    expect(resolvedAvatarSeed("player-123", null)).toBe(avatarSeed("player-123"));
  });
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