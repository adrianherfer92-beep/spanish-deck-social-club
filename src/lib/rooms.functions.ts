import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { ENGINES } from "@/lib/games";
import { MoveError } from "@/lib/games/types";
import { pointsForPosition } from "@/lib/games/cards";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Devuelve el usuario registrado si la petición trae sesión; si no, null (invitado). */
async function optionalUserId(): Promise<string | null> {
  const auth = getRequest()?.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const sb = await admin();
  const { data } = await sb.auth.getUser(auth.slice(7));
  return data.user?.id ?? null;
}

/** Aviso sin datos a todos los navegadores de la mesa: "ha cambiado algo, pedid vuestra vista". */
async function notify(code: string) {
  try {
    const sb = await admin();
    await sb.channel(`sala:${code}`).httpSend("cambio", {});
  } catch (e) {
    console.error("notify", e);
  }
}

const randomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};
const randomToken = () => crypto.randomUUID() + crypto.randomUUID();

async function displayName(userId: string | null, fallback: string) {
  if (!userId) return fallback;
  const sb = await admin();
  const { data } = await sb.from("profiles").select("username").eq("id", userId).maybeSingle();
  return data?.username ?? fallback;
}

const nameSchema = z.string().trim().min(1, "Escribe tu nombre").max(20);

export const createRoom = createServerFn({ method: "POST" })
  .inputValidator(z.object({ game: z.string(), name: nameSchema }))
  .handler(async ({ data }) => {
    if (!ENGINES[data.game]) throw new Error("Juego no disponible");
    const sb = await admin();
    const userId = await optionalUserId();
    const name = await displayName(userId, data.name);
    let room: { id: string; code: string } | null = null;
    for (let i = 0; i < 5 && !room; i++) {
      const { data: r } = await sb.from("rooms").insert({ code: randomCode(), game: data.game }).select("id, code").single();
      room = r;
    }
    if (!room) throw new Error("No se pudo crear la sala");
    const token = randomToken();
    const { data: p, error } = await sb
      .from("room_players")
      .insert({ room_id: room.id, user_id: userId, name, token, seat: 0 })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await sb.from("rooms").update({ host_player_id: p.id }).eq("id", room.id);
    return { code: room.code, token };
  });

export const joinRoom = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string().trim().toUpperCase(), name: nameSchema }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: room } = await sb.from("rooms").select("*").eq("code", data.code).maybeSingle();
    if (!room) throw new Error("No existe ninguna sala con ese código");
    const userId = await optionalUserId();
    const { data: players } = await sb.from("room_players").select("*").eq("room_id", room.id).order("seat");
    const list = players ?? [];
    if (userId) {
      const mine = list.find((p) => p.user_id === userId);
      if (mine) return { code: room.code, token: mine.token };
    }
    if (room.status !== "lobby") throw new Error("La partida ya ha empezado");
    const max = ENGINES[room.game].maxPlayers;
    if (list.length >= max) throw new Error(`La sala está llena (máximo ${max})`);
    const name = await displayName(userId, data.name);
    const token = randomToken();
    const seat = list.length ? Math.max(...list.map((p) => p.seat)) + 1 : 0;
    const { error } = await sb.from("room_players").insert({ room_id: room.id, user_id: userId, name, token, seat });
    if (error) throw new Error(error.message);
    await notify(room.code);
    return { code: room.code, token };
  });

async function loadRoom(code: string, token: string) {
  const sb = await admin();
  const { data: room } = await sb.from("rooms").select("*").eq("code", code.toUpperCase()).maybeSingle();
  if (!room) throw new Error("Sala no encontrada");
  const { data: players } = await sb.from("room_players").select("*").eq("room_id", room.id).order("seat");
  const list = players ?? [];
  const me = list.find((p) => p.token === token) ?? null;
  return { sb, room, players: list, me };
}

export const getRoom = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), token: z.string().optional().default("") }))
  .handler(async ({ data }) => {
    const { sb, room, players, me } = await loadRoom(data.code, data.token);
    const engine = ENGINES[room.game];
    const myIndex = me ? players.findIndex((p) => p.id === me.id) : -1;
    let results: { name: string; position: number; points: number; registered: boolean }[] | null = null;
    if (room.status === "finished") {
      const { data: r } = await sb.from("game_results").select("*").eq("room_id", room.id).order("position");
      results = (r ?? []).map((x) => ({ name: x.name, position: x.position, points: x.points, registered: !!x.user_id }));
    }
    return {
      code: room.code,
      game: room.game,
      status: room.status as "lobby" | "playing" | "finished",
      version: room.version,
      isHost: !!me && me.id === room.host_player_id,
      mySeat: myIndex,
      joined: !!me,
      minPlayers: engine.minPlayers,
      maxPlayers: engine.maxPlayers,
      players: players.map((p) => ({ id: p.id, name: p.name, registered: !!p.user_id, host: p.id === room.host_player_id })),
      view: room.state && room.status !== "lobby" ? (engine.view(room.state, room.status === "finished" ? -1 : myIndex) as any) : null,
      finalView: room.state && room.status === "finished" ? (engine.view(room.state, myIndex) as any) : null,
      results,
    };
  });

export const startGame = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), token: z.string() }))
  .handler(async ({ data }) => {
    const { sb, room, players, me } = await loadRoom(data.code, data.token);
    if (!me || me.id !== room.host_player_id) throw new Error("Solo el anfitrión puede empezar");
    if (room.status === "playing") throw new Error("La partida ya ha empezado");
    const engine = ENGINES[room.game];
    if (players.length < engine.minPlayers) throw new Error(`Hacen falta al menos ${engine.minPlayers} jugadores`);
    if (room.status === "finished") await sb.from("game_results").delete().eq("room_id", room.id);
    const state = engine.init(players.length);
    await sb.from("rooms").update({ status: "playing", state: state as any, version: room.version + 1 }).eq("id", room.id);
    await notify(room.code);
    return { ok: true };
  });

export const makeMove = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string(),
      token: z.string(),
      action: z.object({ type: z.string(), card: z.string().optional(), take: z.array(z.string()).optional() }),
    }),
  )
  .handler(async ({ data }) => {
    const { sb, room, players, me } = await loadRoom(data.code, data.token);
    if (!me) throw new Error("No estás en esta sala");
    if (room.status !== "playing") throw new Error("La partida no está en curso");
    const engine = ENGINES[room.game];
    const seat = players.findIndex((p) => p.id === me.id);
    let next;
    try {
      next = engine.move(room.state as any, seat, data.action);
    } catch (e) {
      if (e instanceof MoveError) return { ok: false as const, error: e.message };
      throw e;
    }
    const ranking = engine.ranking(next);
    const { data: updated } = await sb
      .from("rooms")
      .update({ state: next as any, version: room.version + 1, status: ranking ? "finished" : "playing" })
      .eq("id", room.id)
      .eq("version", room.version)
      .select("id");
    if (!updated?.length) return { ok: false as const, error: "Alguien jugó a la vez, inténtalo de nuevo." };
    if (ranking) {
      const rows = ranking.map((s, i) => {
        const p = players[s];
        return { user_id: p.user_id, name: p.name, position: i + 1, points: p.user_id ? pointsForPosition(i + 1) : 0 };
      });
      const { error } = await sb.rpc("apply_game_results", { _room: room.id, _game: room.game, _rows: rows });
      if (error) console.error("apply_game_results", error);
    }
    await notify(room.code);
    return { ok: true as const };
  });

export const backToLobby = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), token: z.string() }))
  .handler(async ({ data }) => {
    const { sb, room, me } = await loadRoom(data.code, data.token);
    if (!me || me.id !== room.host_player_id) throw new Error("Solo el anfitrión puede hacerlo");
    await sb.from("game_results").delete().eq("room_id", room.id);
    await sb.from("rooms").update({ status: "lobby", state: null, version: room.version + 1 }).eq("id", room.id);
    await notify(room.code);
    return { ok: true };
  });

export const leaveRoom = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), token: z.string() }))
  .handler(async ({ data }) => {
    const { sb, room, players, me } = await loadRoom(data.code, data.token);
    if (!me || room.status === "playing") return { ok: false };
    await sb.from("room_players").delete().eq("id", me.id);
    if (me.id === room.host_player_id) {
      const other = players.find((p) => p.id !== me.id);
      if (other) await sb.from("rooms").update({ host_player_id: other.id }).eq("id", room.id);
      else await sb.from("rooms").delete().eq("id", room.id);
    }
    await notify(room.code);
    return { ok: true };
  });

export const getRanking = createServerFn({ method: "POST" })
  .inputValidator(z.object({ scope: z.enum(["global", "friends"]) }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const userId = await optionalUserId();
    if (data.scope === "friends") {
      if (!userId) return { needsAuth: true, rows: [] as Row[], me: null };
      const { data: myRooms } = await sb.from("room_players").select("room_id").eq("user_id", userId);
      const roomIds = [...new Set((myRooms ?? []).map((r) => r.room_id))];
      let ids = [userId];
      if (roomIds.length) {
        const { data: mates } = await sb.from("room_players").select("user_id").in("room_id", roomIds).not("user_id", "is", null);
        ids = [...new Set([userId, ...(mates ?? []).map((m) => m.user_id as string)])];
      }
      const { data: rows } = await sb.from("profiles").select("id, username, points, games_played, wins").in("id", ids).order("points", { ascending: false });
      return { needsAuth: false, rows: (rows ?? []) as Row[], me: userId };
    }
    const { data: rows } = await sb.from("profiles").select("id, username, points, games_played, wins").order("points", { ascending: false }).limit(50);
    return { needsAuth: false, rows: (rows ?? []) as Row[], me: userId };
  });

type Row = { id: string; username: string; points: number; games_played: number; wins: number };
