CREATE FUNCTION public.cleanup_moderation() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ DELETE FROM public.player_reports WHERE coalesce(resolved_at,created_at)<now()-interval '90 days' $$;
REVOKE ALL ON FUNCTION public.cleanup_moderation() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_moderation() TO service_role;
SELECT cron.schedule('limpiar-moderacion','20 4 * * *','SELECT public.cleanup_moderation()');