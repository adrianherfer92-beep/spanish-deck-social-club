ALTER TABLE public.rooms ADD COLUMN creator_player_id uuid;
UPDATE public.rooms SET creator_player_id = host_player_id WHERE creator_player_id IS NULL;
ALTER TABLE public.room_players ADD COLUMN left_at timestamptz;
CREATE TABLE public.point_penalties (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
 reason text NOT NULL CHECK (reason IN ('delete_game', 'leave_game')),
 points integer NOT NULL CHECK (points IN (-1, -2)),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.point_penalties TO service_role;
ALTER TABLE public.point_penalties ENABLE ROW LEVEL SECURITY;
CREATE INDEX point_penalties_user_idx ON public.point_penalties(user_id);
CREATE OR REPLACE FUNCTION public.apply_game_results(_room uuid, _game text, _rows jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.rooms;
BEGIN
 SELECT * INTO r FROM public.rooms WHERE id = _room FOR UPDATE;
 IF NOT FOUND OR r.status <> 'finished' OR EXISTS (SELECT 1 FROM public.game_results WHERE room_id = _room) THEN RETURN; END IF;
 INSERT INTO public.game_results (room_id, game, user_id, name, position, points)
 SELECT _room, _game, (x->>'user_id')::uuid, x->>'name', (x->>'position')::int, (x->>'points')::int FROM jsonb_array_elements(_rows) x;
 UPDATE public.profiles p SET points = p.points + (x->>'points')::int,
 games_played = p.games_played + 1, wins = p.wins + CASE WHEN (x->>'position')::int = 1 AND (x->>'points')::int > 0 THEN 1 ELSE 0 END
 FROM jsonb_array_elements(_rows) x WHERE x->>'user_id' IS NOT NULL AND p.id = (x->>'user_id')::uuid;
END $$;
REVOKE ALL ON FUNCTION public.apply_game_results(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_game_results(uuid,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.exit_room(_room uuid, _player uuid, _token text, _delete boolean, _version integer, _state jsonb DEFAULT NULL, _rows jsonb DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.rooms; p public.room_players; cost integer := 0; next_host uuid;
BEGIN
 SELECT * INTO r FROM public.rooms WHERE id = _room FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sala no encontrada'; END IF;
 SELECT * INTO p FROM public.room_players WHERE id = _player AND room_id = _room AND token = _token FOR UPDATE;
 IF NOT FOUND OR p.left_at IS NOT NULL THEN RAISE EXCEPTION 'Ya no participas en esta mesa'; END IF;
 IF r.status = 'cancelled' THEN RAISE EXCEPTION 'La partida ha sido eliminada'; END IF;
 IF r.version <> _version THEN RAISE EXCEPTION 'La mesa ha cambiado. Vuelve a intentarlo'; END IF;
 IF _delete AND r.creator_player_id IS DISTINCT FROM p.id THEN RAISE EXCEPTION 'Solo el creador puede eliminar la partida'; END IF;
 IF NOT _delete AND r.status = 'playing' AND r.creator_player_id = p.id THEN RAISE EXCEPTION 'El creador debe usar Eliminar partida'; END IF;
 IF r.status = 'playing' AND p.user_id IS NOT NULL THEN cost := CASE WHEN _delete THEN 1 ELSE 2 END; END IF;
 IF cost > 0 THEN
   INSERT INTO public.point_penalties(user_id,room_id,reason,points) VALUES(p.user_id,r.id,CASE WHEN _delete THEN 'delete_game' ELSE 'leave_game' END,-cost);
   UPDATE public.profiles SET points = points - cost WHERE id = p.user_id;
 END IF;
 IF _delete THEN
   UPDATE public.rooms SET status = 'cancelled', state = NULL, version = version + 1 WHERE id = r.id;
 ELSIF r.status = 'playing' THEN
   UPDATE public.room_players SET left_at = now(), gif_reaction = NULL WHERE id = p.id;
   UPDATE public.rooms SET state = _state, status = CASE WHEN _rows IS NULL THEN 'playing' ELSE 'finished' END, version = version + 1 WHERE id = r.id;
   IF _rows IS NOT NULL THEN PERFORM public.apply_game_results(r.id,r.game,_rows); END IF;
 ELSE
   DELETE FROM public.room_players WHERE id = p.id;
   IF r.host_player_id = p.id THEN
     SELECT id INTO next_host FROM public.room_players WHERE room_id = r.id AND left_at IS NULL ORDER BY seat LIMIT 1;
     UPDATE public.rooms SET host_player_id = next_host, version = version + 1 WHERE id = r.id;
     IF next_host IS NULL THEN UPDATE public.rooms SET status = 'cancelled', state = NULL WHERE id = r.id; END IF;
   ELSE
     UPDATE public.rooms SET version = version + 1 WHERE id = r.id;
   END IF;
 END IF;
 RETURN cost;
END $$;
REVOKE ALL ON FUNCTION public.exit_room(uuid,uuid,text,boolean,integer,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exit_room(uuid,uuid,text,boolean,integer,jsonb,jsonb) TO service_role;