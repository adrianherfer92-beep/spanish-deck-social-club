REVOKE ALL ON TABLE public.room_chat_messages FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.room_chat_messages TO service_role;
REVOKE ALL ON SEQUENCE public.room_chat_messages_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.room_chat_messages_id_seq TO service_role;