ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz;

-- Nunca usar nombre real ni parte del correo como nombre público.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base text; candidate text; n int := 0;
BEGIN
  base := left(coalesce(nullif(trim(NEW.raw_user_meta_data->>'username'), ''),
                        'jugador' || (floor(random()*9000)+1000)::int::text), 20);
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    n := n + 1;
    candidate := left(base, 16) || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, privacy_accepted_at)
  VALUES (NEW.id, candidate,
          CASE WHEN NEW.raw_user_meta_data ? 'privacy_accepted_at' THEN now() ELSE NULL END);
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;