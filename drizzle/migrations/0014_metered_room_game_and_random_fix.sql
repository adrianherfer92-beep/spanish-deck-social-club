CREATE OR REPLACE FUNCTION public.create_metered_room(_user uuid,_environment text,_game text,_name text,_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _day date := (now() AT TIME ZONE 'Europe/Madrid')::date; _kind text; _purchase uuid; _room uuid; _player uuid; _code text;
BEGIN
 IF _environment NOT IN ('sandbox','live') OR _user IS NULL THEN RAISE EXCEPTION 'Debes entrar en tu cuenta para crear una partida'; END IF;
 IF _game NOT IN ('cinquillo','burro','siete-y-medio','escoba') THEN RAISE EXCEPTION 'Juego no disponible'; END IF;
 PERFORM id FROM public.profiles WHERE id=_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta no disponible'; END IF;
 IF EXISTS(SELECT 1 FROM public.moderation_suspensions WHERE user_id=_user AND until_at>now()) THEN RAISE EXCEPTION 'Participación suspendida'; END IF;
 IF public.has_role(_user,'admin') THEN _kind:='admin';
 ELSIF NOT EXISTS(SELECT 1 FROM public.room_creation_usage WHERE user_id=_user AND environment=_environment AND day=_day AND kind='free') THEN _kind:='free';
 ELSE
  SELECT id INTO _purchase FROM public.room_purchases WHERE user_id=_user AND environment=_environment AND status='paid' AND consumed_at IS NULL ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF _purchase IS NULL THEN RAISE EXCEPTION 'Has usado tu partida gratuita de hoy. La siguiente cuesta 1 €.'; END IF;
  _kind:='paid';
 END IF;
 LOOP
  _code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  BEGIN
   INSERT INTO public.rooms(code,game) VALUES(_code,_game) RETURNING id INTO _room;
   EXIT;
  EXCEPTION WHEN unique_violation THEN CONTINUE;
  END;
 END LOOP;
 INSERT INTO public.room_players(room_id,user_id,name,token,seat) VALUES(_room,_user,_name,_token,0) RETURNING id INTO _player;
 UPDATE public.rooms SET host_player_id=_player,creator_player_id=_player WHERE id=_room;
 INSERT INTO public.room_creation_usage(user_id,environment,day,kind,purchase_id,room_id) VALUES(_user,_environment,_day,_kind,_purchase,_room);
 IF _purchase IS NOT NULL THEN UPDATE public.room_purchases SET consumed_at=now() WHERE id=_purchase; END IF;
 RETURN jsonb_build_object('code',_code,'token',_token);
END $$;
REVOKE ALL ON FUNCTION public.create_metered_room(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_metered_room(uuid,text,text,text,text) TO service_role;