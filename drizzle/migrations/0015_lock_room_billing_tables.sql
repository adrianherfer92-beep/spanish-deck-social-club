REVOKE ALL ON public.room_purchases FROM anon,authenticated;
REVOKE ALL ON public.room_creation_usage FROM anon,authenticated;
GRANT ALL ON public.room_purchases TO service_role;
GRANT ALL ON public.room_creation_usage TO service_role;