import { createAvatar } from "@dicebear/core";
import * as bottts from "@dicebear/bottts";

/** Cosmetic identifier only; never use this hash for authorization. */
export function avatarSeed(id: string): string {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  }
  return `timba-${(hash >>> 0).toString(36)}`;
}

export function avatarDataUri(seed: string): string {
  return createAvatar(bottts, { seed, size: 96 }).toDataUri();
}

export function randomAvatarSeed(): string {
  return `timba-${crypto.randomUUID()}`;
}

export function resolvedAvatarSeed(id: string, chosen?: string | null): string {
  return chosen ?? avatarSeed(id);
}