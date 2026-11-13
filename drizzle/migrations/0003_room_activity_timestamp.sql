ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS rooms_updated_at_idx ON public.rooms(updated_at);
CREATE OR REPLACE FUNCTION public.touch_room() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER rooms_touch BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.touch_room();

CREATE OR REPLACE FUNCTION public.cleanup_abandoned_rooms() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Mesas sin ninguna partida terminada y sin actividad en 2 días: se borran.
  DELETE FROM public.rooms r
  WHERE r.updated_at < now() - interval '2 days'
    AND NOT EXISTS (SELECT 1 FROM public.game_results g WHERE g.room_id = r.id);
  -- Mesas con partidas puntuadas: se conservan para el ranking, pero se vacía la partida guardada.
  UPDATE public.rooms SET state = NULL, status = 'finished'
  WHERE updated_at < now() - interval '2 days' AND state IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.cleanup_abandoned_rooms() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_abandoned_rooms() TO service_role;