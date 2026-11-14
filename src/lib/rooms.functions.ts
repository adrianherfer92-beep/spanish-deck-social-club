import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { ENGINES } from "@/lib/games";
import { MoveError } from "@/lib/games/types";
import { autoMove, advanceDeparted, resultRows } from "@/lib/room-points";
import { resolvedAvatarSeed } from "@/lib/avatars";
import { gifWaitSeconds, safeGif, GIF_VISIBLE_MS, type Gif } from "@/lib/gifs";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { environmentSchema, PAYMENTS_ENABLED } from "@/lib/room-billing";

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
  if (!data.user) throw new Error("Tu sesión no es válida. Vuelve a entrar.");
  const { assertNotSuspended } = await import("./moderation.server");
  await assertNotSuspended(sb, data.user.id);
  return data.user.id;
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
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ game: z.string(), name: nameSchema, environment: environmentSchema }))
  .handler(async ({ data, context }) => {
    if (!ENGINES[data.game]) throw new Error("Juego no disponible");
    const sb = await admin();
    const userId = context.userId;
    const { assertNotSuspended } = await import("./moderation.server");
    await assertNotSuspended(sb, userId);
    const role = await context.supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (role.error) throw new Error("No se pudo comprobar tu acceso");
    const name = await displayName(userId, data.name);
    const token = randomToken();
    const { data: room, error } = await sb.rpc("create_metered_room", { _user: userId, _environment: data.environment, _game: data.game, _name: name, _token: token, _payments_enabled: PAYMENTS_ENABLED });
    if (error) return { error: error.message };
    if (!room || typeof room !== "object" || Array.isArray(room) || typeof room.code !== "string") return { error: "No se pudo crear la sala" };
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
      if (mine?.left_at) throw new Error("Has abandonado esta partida. Espera a la siguiente.");
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
  const me = list.find((p) => p.token === token && !p.left_at) ?? null;
  const { assertNotSuspended } = await import("./moderation.server");
  await assertNotSuspended(sb, await optionalUserId());
  if (me) await assertNotSuspended(sb, me.user_id, me.id);
  return { sb, room, players: list, me };
}

export const getRoom = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), token: z.string().optional().default("") }))
  .handler(async ({ data }) => {
    const { sb, room, players, me } = await loadRoom(data.code, data.token);
    const engine = ENGINES[room.game];
    const myIndex = me ? players.findIndex((p) => p.id === me.id) : -1;
    const now = Date.now();
    const expired = players.filter(p => p.gif_reaction && p.gif_sent_at && now - Date.parse(p.gif_sent_at) >= GIF_VISIBLE_MS);
    if (expired.length) await sb.from("room_players").update({ gif_reaction: null }).in("id", expired.map(p => p.id)).lt("gif_sent_at", new Date(now - GIF_VISIBLE_MS).toISOString());
    const profileIds = players.flatMap((p) => p.user_id ? [p.user_id] : []);
    const avatars = new Map<string, string | null>();
    if (profileIds.length) {
      const { data: profiles, error } = await sb.from("profiles").select("id, avatar_seed").in("id", profileIds);
      if (error) throw new Error("No se pudieron cargar los avatares");
      for (const p of profiles ?? []) avatars.set(p.id, p.avatar_seed);
    }
    let results: { name: string; position: number; points: number; registered: boolean }[] | null = null;
    if (room.status === "finished") {
      const { data: r } = await sb.from("game_results").select("*").eq("room_id", room.id).order("position");
      results = (r ?? []).map((x) => ({ name: x.name, position: x.position, points: x.points, registered: !!x.user_id }));
    }
    return {
      code: room.code,
      game: room.game,
      status: room.status as "lobby" | "playing" | "finished" | "cancelled",
      version: room.version,
      isHost: !!me && me.id === room.host_player_id,
      isCreator: !!me && me.id === room.creator_player_id,
      mySeat: myIndex,
      joined: !!me,
      minPlayers: engine.minPlayers,
      maxPlayers: engine.maxPlayers,
      players: players.map((p) => ({ id: p.id, name: p.left_at ? `${p.name} (ha salido)` : p.name, avatarSeed: resolvedAvatarSeed(p.user_id ?? p.id, p.user_id ? avatars.get(p.user_id) : null), registered: !!p.user_id, host: p.id === room.host_player_id })),
      view: room.state && room.status !== "lobby" ? (engine.view(room.state, room.status === "finished" ? -1 : myIndex) as any) : null,
      finalView: room.state && room.status === "finished" ? (engine.view(room.state, myIndex) as any) : null,
      results,
      turnSeconds: room.turn_seconds as number | null,
      turnStartedAt: room.updated_at as string,
      serverNow: new Date().toISOString(),
      gifSentAt: me?.gif_sent_at ?? null,
      reactions: me && room.status === "playing" ? players.flatMap(p => p.gif_reaction && p.gif_sent_at && now - Date.parse(p.gif_sent_at) < GIF_VISIBLE_MS ? [{ playerId: p.id, name: p.name, sentAt: p.gif_sent_at, gif: p.gif_reaction as unknown as Gif }] : []) : [],
    };
  });

export const startGame = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), token: z.string() }))
  .handler(async ({ data }) => {
    const { sb, room, players, me } = await loadRoom(data.code, data.token);
    if (!me || me.id !== room.host_player_id) throw new Error("Solo el anfitrión puede empezar");
    if (room.status === "cancelled") throw new Error("La partida ha sido eliminada");
    const activePlayers = players.filter(p => !p.left_at);
    if (room.status === "playing") throw new Error("La partida ya ha empezado");
    const engine = ENGINES[room.game];
    if (activePlayers.length < engine.minPlayers) throw new Error(`Hacen falta al menos ${engine.minPlayers} jugadores`);
    if (room.status === "finished") throw new Error("Crea una nueva partida desde el inicio");
    await sb.from("room_players").delete().eq("room_id", room.id).not("left_at", "is", null);
    const state = engine.init(activePlayers.length);
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
      next = advanceDeparted(engine, engine.move(room.state as any, seat, data.action), players);
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
      const rows = resultRows(ranking, players);
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
    if (room.status !== "finished") throw new Error("La partida aún no ha terminado");
    throw new Error("Crea una nueva partida desde el inicio para aplicar el límite diario");
  });

export const leaveRoom = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), token: z.string() }))
  .handler(async ({ data }) => {
    const { sb, room, players, me } = await loadRoom(data.code, data.token);
    if (!me) throw new Error("No estás en esta sala");
    const departed = players.map(p => p.id === me.id ? { ...p, left_at: new Date().toISOString() } : p);
    const next = room.status === "playing" ? advanceDeparted(ENGINES[room.game], room.state, departed) : null;
    const ranking = next ? ENGINES[room.game].ranking(next) : null;
    const { data: penalty, error } = await sb.rpc("exit_room", { _room: room.id, _player: me.id, _token: data.token, _delete: false, _version: room.version, _state: next as any, _rows: ranking ? resultRows(ranking, departed) : null });
    if (error) throw new Error(error.message);
    await notify(room.code);
    return { ok: true, penalty: penalty ?? 0 };
  });

export const deleteRoom = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), token: z.string() }))
  .handler(async ({ data }) => {
    const { sb, room, me } = await loadRoom(data.code, data.token);
    if (!me || me.id !== room.creator_player_id) throw new Error("Solo el creador puede eliminar la partida");
    const { data: penalty, error } = await sb.rpc("exit_room", { _room: room.id, _player: me.id, _token: data.token, _delete: true, _version: room.version });
    if (error) throw new Error(error.message);
    await notify(room.code);
    return { ok: true, penalty: penalty ?? 0 };
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
      const { data: rows } = await sb.from("profiles").select("id, username, points, games_played, wins, avatar_seed").in("id", ids).order("points", { ascending: false });
      return { needsAuth: false, rows: (rows ?? []) as Row[], me: userId };
    }
    const { data: rows } = await sb.from("profiles").select("id, username, points, games_played, wins, avatar_seed").order("points", { ascending: false }).limit(50);
    return { needsAuth: false, rows: (rows ?? []) as Row[], me: userId };
  });

type Row = { id: string; username: string; points: number; games_played: number; wins: number; avatar_seed: string | null };

export const skipTurn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), token: z.string() }))
  .handler(async ({ data }) => {
    const { sb, room, players, me } = await loadRoom(data.code, data.token);
    if (!me || room.status !== "playing" || !room.turn_seconds) return { ok: false };
    const elapsed = (Date.now() - new Date(room.updated_at).getTime()) / 1000;
    if (elapsed < room.turn_seconds) return { ok: false };
    const engine = ENGINES[room.game];
    const turn = (room.state as any)?.turn;
    if (typeof turn !== "number") return { ok: false };
    const moved = autoMove(engine, room.state, turn);
    if (!moved) return { ok: false };
    const next = advanceDeparted(engine, moved, players);
    const ranking = engine.ranking(next);
    const { data: updated } = await sb
      .from("rooms")
      .update({ state: next as any, version: room.version + 1, status: ranking ? "finished" : "playing" })
      .eq("id", room.id)
      .eq("version", room.version)
      .select("id");
    if (!updated?.length) return { ok: false };
    if (ranking) {
      const rows = resultRows(ranking, players);
      await sb.rpc("apply_game_results", { _room: room.id, _game: room.game, _rows: rows });
    }
    await notify(room.code);
    return { ok: true };
  });

export const setTurnTimer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), token: z.string(), seconds: z.number().int().min(15).max(300).nullable() }))
  .handler(async ({ data }) => {
    const { sb, room, me } = await loadRoom(data.code, data.token);
    if (!me || me.id !== room.host_player_id) throw new Error("Solo el anfitrión puede cambiarlo");
    await sb.from("rooms").update({ turn_seconds: data.seconds }).eq("id", room.id);
    await notify(room.code);
    return { ok: true };
  });

export const kickPlayer = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), token: z.string(), playerId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { sb, room, me } = await loadRoom(data.code, data.token);
    if (!me || me.id !== room.host_player_id) throw new Error("Solo el anfitrión puede expulsar");
    if (room.status === "playing") throw new Error("No se puede expulsar durante la partida");
    if (data.playerId === me.id) throw new Error("No puedes expulsarte a ti mismo");
    await sb.from("room_players").delete().eq("id", data.playerId).eq("room_id", room.id);
    await notify(room.code);
    return { ok: true };
  });

/** Origen público de la petición, para URLs absolutas en las vistas previas al compartir. */
export const getOrigin = createServerFn({ method: "GET" }).handler(async () => {
  const req = getRequest();
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
});

const gifRoomSchema = z.object({ code: z.string().max(10), token: z.string().max(100) });
const GIPHY_GATEWAY = "https://connector-gateway.lovable.dev/udc_giphy/v1/gifs";

async function fetchGiphy(path: string, params: Record<string, string> = {}) {
  const key = process.env.UDC_GIPHY_API_KEY;
  const gatewayKey = process.env.LOVABLE_API_KEY;
  if (!key || !gatewayKey) throw new Error("GIPHY no está conectado");
  const url = new URL(`${GIPHY_GATEWAY}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${gatewayKey}`, "X-Connection-Api-Key": key }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    // Do not log provider bodies: they can echo credential-bearing URLs.
    console.error("GIPHY request failed", response.status);
    throw new Error(response.status === 429 ? "GIPHY ha alcanzado su límite de consultas; inténtalo más tarde" : `GIPHY no está disponible (${response.status})`);
  }
  return response.json() as Promise<{ data: any }>;
}

export const searchRoomGifs = createServerFn({ method: "POST" })
  .inputValidator(gifRoomSchema.extend({ query: z.string().trim().max(60) }))
  .handler(async ({ data }) => {
    const { sb, room, me } = await loadRoom(data.code, data.token);
    if (!me || room.status !== "playing") throw new Error("Solo los jugadores de la partida pueden buscar GIFs");
    const { data: allowed, error } = await sb.rpc("claim_giphy_search", { _player: me.id });
    if (error) throw new Error("No se pudo comprobar el límite");
    if (!allowed) throw new Error("Espera 3 segundos antes de otra búsqueda");
    const response = await fetchGiphy(data.query ? "/search" : "/trending", { limit: "12", rating: "g", lang: "es", ...(data.query ? { q: data.query } : {}) });
    return (response.data as any[]).flatMap(raw => { const gif = safeGif(raw); return gif ? [gif] : []; });
  });

export const sendRoomGif = createServerFn({ method: "POST" })
  .inputValidator(gifRoomSchema.extend({ gifId: z.string().regex(/^[a-zA-Z0-9]{1,100}$/) }))
  .handler(async ({ data }) => {
    const { sb, room, me } = await loadRoom(data.code, data.token);
    if (!me || room.status !== "playing") throw new Error("Solo los jugadores de la partida pueden enviar GIFs");
    const wait = gifWaitSeconds(me.gif_sent_at);
    if (wait) throw new Error(`Espera ${wait} segundos para enviar otro GIF`);
    const raw = await fetchGiphy(`/${data.gifId}`);
    const gif = safeGif(raw.data);
    if (!gif) throw new Error("Este GIF no está disponible o no es apto para todos");
    const { data: sent, error } = await sb.rpc("send_room_gif", { _player: me.id, _reaction: gif });
    if (error) throw new Error("No se pudo enviar el GIF");
    if (!sent) throw new Error("Solo puedes enviar un GIF cada 30 segundos");
    await notify(room.code);
    return { ok: true };
  });
