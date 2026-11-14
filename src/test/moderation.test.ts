import { describe, it, expect, vi } from "vitest";
import { decisionSchema, isSuspended } from "@/lib/moderation";
import { assertAdmin, assertNotSuspended } from "@/lib/moderation.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

describe("Moderation permissions", () => {
  it("only grants administrator access when the server role check is true", async () => {
    for (const data of [false, null]) {
      const rpc = vi.fn().mockResolvedValue({ data, error: null });
      await expect(assertAdmin({ rpc } as unknown as SupabaseClient<Database>, "host")).rejects.toThrow("Acceso reservado");
      expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: "host", _role: "admin" });
    }
    await expect(assertAdmin({ rpc: vi.fn().mockResolvedValue({ data: true, error: null }) } as unknown as SupabaseClient<Database>, "admin")).resolves.toBeUndefined();
  });
  it("suspensions expire at their exact end time", () => {
    const end = "2026-11-15T12:00:00Z";
    expect(isSuspended(end, Date.parse(end) - 1)).toBe(true);
    expect(isSuspended(end, Date.parse(end))).toBe(false);
  });
  it("rejects a suspended account even when it uses its guest room token", async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gt: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [{ until_at: "2099-01-01T00:00:00Z" }], error: null }) };
    await expect(assertNotSuspended({ from: () => query } as unknown as SupabaseClient<Database>, "account", "player")).rejects.toThrow("Participación suspendida");
    expect(query.eq).toHaveBeenCalledWith("user_id", "account");
  });
  it("rejects a suspended guest identity", async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gt: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [{ until_at: "2099-01-01T00:00:00Z" }], error: null }) };
    await expect(assertNotSuspended({ from: () => query } as unknown as SupabaseClient<Database>, null, "guest")).rejects.toThrow("Participación suspendida");
    expect(query.eq).toHaveBeenCalledWith("player_id", "guest");
  });
  it("requires a recorded reason for both suspension and dismissal", () => {
    const reportId = "76e6eb6c-545a-414e-81f7-04962b95eabb";
    for (const action of ["suspended", "dismissed"]) {
      expect(decisionSchema.safeParse({ reportId, action, reason: "", hours: 24 }).success).toBe(false);
      expect(decisionSchema.safeParse({ reportId, action, reason: "Revisión manual", hours: 24 }).success).toBe(true);
    }
  });
});