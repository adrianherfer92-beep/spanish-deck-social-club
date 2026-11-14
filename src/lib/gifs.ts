export const GIF_COOLDOWN_MS = 30_000;
export const GIF_VISIBLE_MS = 15_000;
export type Gif = { id: string; title: string; url: string };

export function gifWaitSeconds(sentAt: string | null, now = Date.now()) {
  return sentAt ? Math.max(0, Math.ceil((Date.parse(sentAt) + GIF_COOLDOWN_MS - now) / 1000)) : 0;
}

export function safeGif(raw: any): Gif | null {
  const url = raw?.images?.fixed_width?.url;
  if (raw?.rating !== "g" || typeof raw.id !== "string" || !/^[a-zA-Z0-9]+$/.test(raw.id) || typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !/^media\d*\.giphy\.com$/.test(parsed.hostname)) return null;
    return { id: raw.id, title: String(raw.title ?? "GIF").slice(0, 120), url };
  } catch { return null; }
}