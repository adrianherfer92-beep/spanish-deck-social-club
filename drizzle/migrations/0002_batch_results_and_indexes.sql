CREATE INDEX IF NOT EXISTS game_results_user_idx ON public.game_results(user_id);
CREATE INDEX IF NOT EXISTS game_results_room_idx ON public.game_results(room_id);
CREATE INDEX IF NOT EXISTS profiles_points_idx ON public.profiles(points DESC);

CREATE OR REPLACE FUNCTION public.apply_game_results(_room uuid, _game text, _rows jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.game_results (room_id, game, user_id, name, position, points)
  SELECT _room, _game, (r->>'user_id')::uuid, r->>'name', (r->>'position')::int, (r->>'points')::int
  FROM jsonb_array_elements(_rows) r;

  UPDATE public.profiles p
  SET points = p.points + (r->>'points')::int,
      games_played = p.games_played + 1,
      wins = p.wins + CASE WHEN (r->>'position')::int = 1 THEN 1 ELSE 0 END
  FROM jsonb_array_elements(_rows) r
  WHERE r->>'user_id' IS NOT NULL AND p.id = (r->>'user_id')::uuid;
END $$;
REVOKE ALL ON FUNCTION public.apply_game_results(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_game_results(uuid, text, jsonb) TO service_role;