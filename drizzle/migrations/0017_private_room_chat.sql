CREATE TABLE public.room_chat_messages (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
 player_id uuid REFERENCES public.room_players(id) ON DELETE SET NULL,
 user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
 name text NOT NULL,
 body text,
 gif jsonb,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT chat_one_content CHECK ((body IS NOT NULL AND gif IS NULL AND char_length(btrim(body)) BETWEEN 1 AND 500) OR (body IS NULL AND gif IS NOT NULL AND jsonb_typeof(gif)='object'))
);
GRANT ALL ON TABLE public.room_chat_messages TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.room_chat_messages_id_seq TO service_role;
ALTER TABLE public.room_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX room_chat_recent ON public.room_chat_messages(room_id, id DESC);
CREATE INDEX room_chat_author ON public.room_chat_messages(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX room_chat_retention ON public.room_chat_messages(created_at);
ALTER TABLE public.room_players ADD COLUMN chat_sent_at timestamptz;
COMMENT ON COLUMN public.room_players.gif_reaction IS 'DEPRECATED: new GIFs are stored as room_chat_messages.gif';
CREATE FUNCTION public.send_room_chat(_player uuid, _token text, _body text, _gif jsonb DEFAULT NULL) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.room_players%ROWTYPE; r public.rooms%ROWTYPE; msg bigint; ts timestamptz := clock_timestamp();
BEGIN
 SELECT rooms.* INTO r FROM public.rooms rooms JOIN public.room_players rp ON rp.room_id=rooms.id WHERE rp.id=_player FOR SHARE OF rooms;
 IF NOT FOUND OR r.status NOT IN ('lobby','playing','finished') THEN RAISE EXCEPTION 'Esta mesa no tiene chat disponible'; END IF;
 SELECT * INTO p FROM public.room_players WHERE id=_player AND room_id=r.id FOR UPDATE;
 IF NOT FOUND OR p.left_at IS NOT NULL OR p.token IS DISTINCT FROM _token THEN RAISE EXCEPTION 'No estás en esta sala'; END IF;
 IF EXISTS (SELECT 1 FROM public.moderation_suspensions s WHERE s.until_at>ts AND (s.player_id=p.id OR (p.user_id IS NOT NULL AND s.user_id=p.user_id))) THEN RAISE EXCEPTION 'Participación suspendida'; END IF;
 IF p.chat_sent_at IS NOT NULL AND p.chat_sent_at>ts-interval '2 seconds' THEN RAISE EXCEPTION 'Espera 2 segundos antes de enviar otro mensaje'; END IF;
 IF _gif IS NOT NULL THEN
  IF _body IS NOT NULL OR jsonb_typeof(_gif)<>'object' OR coalesce(_gif->>'id','') !~ '^[a-zA-Z0-9]{1,100}$' OR coalesce(_gif->>'url','') !~ '^https://media[0-9]*[.]giphy[.]com/' THEN RAISE EXCEPTION 'GIF no válido'; END IF;
  IF p.gif_sent_at IS NOT NULL AND p.gif_sent_at>ts-interval '30 seconds' THEN RAISE EXCEPTION 'Solo puedes enviar un GIF cada 30 segundos'; END IF;
 ELSE
  IF _body IS NULL OR char_length(btrim(_body)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Escribe un mensaje de hasta 500 caracteres'; END IF;
 END IF;
 INSERT INTO public.room_chat_messages(room_id,player_id,user_id,name,body,gif,created_at) VALUES(r.id,p.id,p.user_id,p.name,CASE WHEN _gif IS NULL THEN btrim(_body) ELSE NULL END,_gif,ts) RETURNING id INTO msg;
 UPDATE public.room_players SET chat_sent_at=ts, gif_sent_at=CASE WHEN _gif IS NOT NULL THEN ts ELSE gif_sent_at END WHERE id=p.id;
 RETURN msg;
END $$;
REVOKE ALL ON FUNCTION public.send_room_chat(uuid,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_room_chat(uuid,text,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.send_room_gif(_player uuid, _reaction jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text;
BEGIN
 SELECT token INTO t FROM public.room_players WHERE id=_player;
 IF NOT FOUND THEN RETURN false; END IF;
 RETURN public.send_room_chat(_player,t,NULL,_reaction) IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.send_room_gif(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_room_gif(uuid,jsonb) TO service_role;
CREATE FUNCTION public.cleanup_room_chat() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ DELETE FROM public.room_chat_messages WHERE created_at<clock_timestamp()-interval '7 days'; $$;
REVOKE ALL ON FUNCTION public.cleanup_room_chat() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_room_chat() TO service_role;
SELECT cron.schedule('cleanup-room-chat','15 4 * * *','SELECT public.cleanup_room_chat();');