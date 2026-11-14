import { describe, it, expect } from "vitest";
import { gifWaitSeconds, safeGif } from "@/lib/gifs";

describe("GIF sending rules", () => {
  it("enforces one GIF each 30 seconds", () => {
    const sent = "2026-11-14T10:00:00.000Z";
    expect(gifWaitSeconds(sent, Date.parse(sent))).toBe(30);
    expect(gifWaitSeconds(sent, Date.parse(sent) + 29999)).toBe(1);
    expect(gifWaitSeconds(sent, Date.parse(sent) + 30000)).toBe(0);
  });
  it("only accepts general-audience GIPHY media", () => {
    const gif = { id: "abc123", rating: "g", images: { fixed_width: { url: "https://media2.giphy.com/media/abc123/200w.gif" } } };
    expect(safeGif(gif)?.id).toBe("abc123");
    expect(safeGif({ ...gif, rating: "r" })).toBeNull();
    expect(safeGif({ ...gif, images: { fixed_width: { url: "https://example.com/track.gif" } } })).toBeNull();
  });
});