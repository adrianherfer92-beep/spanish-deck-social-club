ALTER TABLE public.profiles ADD COLUMN avatar_seed text;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_seed_format CHECK (avatar_seed IS NULL OR avatar_seed ~ '^timba-[a-z0-9-]{1,64}$');
COMMENT ON COLUMN public.profiles.avatar_seed IS 'Optional cosmetic DiceBear seed chosen by the player; no image or external provider data is stored. Existing owner-only profile RLS applies.';