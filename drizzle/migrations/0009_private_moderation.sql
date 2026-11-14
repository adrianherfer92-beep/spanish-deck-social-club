CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id,role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX one_administrator ON public.user_roles(role) WHERE role='admin';
CREATE POLICY own_role ON public.user_roles FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() = _user_id AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated,service_role;
CREATE TABLE public.player_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_code text NOT NULL, reporter_player_id uuid NOT NULL, target_player_id uuid NOT NULL, reporter_user_id uuid, target_user_id uuid, target_name text NOT NULL, reason text NOT NULL CHECK(reason IN ('alias','gif','acoso','trampas','otro')), comment text NOT NULL DEFAULT '' CHECK(length(comment)<=500), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','dismissed','suspended')), created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz);
GRANT ALL ON public.player_reports TO service_role;
ALTER TABLE public.player_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX pending_reports ON public.player_reports(status,created_at);
CREATE TABLE public.moderation_suspensions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, player_id uuid, until_at timestamptz NOT NULL, report_id uuid NOT NULL REFERENCES public.player_reports(id) ON DELETE CASCADE, CHECK(user_id IS NOT NULL OR player_id IS NOT NULL));
GRANT ALL ON public.moderation_suspensions TO service_role;
ALTER TABLE public.moderation_suspensions ENABLE ROW LEVEL SECURITY;
CREATE INDEX suspended_users ON public.moderation_suspensions(user_id,until_at);
CREATE INDEX suspended_players ON public.moderation_suspensions(player_id,until_at);
CREATE TABLE public.moderation_decisions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), report_id uuid NOT NULL REFERENCES public.player_reports(id) ON DELETE CASCADE, actor_id uuid, action text NOT NULL CHECK(action IN ('dismissed','suspended')), reason text NOT NULL CHECK(length(reason) BETWEEN 5 AND 500), until_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT ON public.moderation_decisions TO service_role;
ALTER TABLE public.moderation_decisions ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.submit_player_report(_room text,_token text,_target uuid,_reason text,_comment text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE me public.room_players; target public.room_players; rid uuid;
BEGIN
 SELECT p.* INTO me FROM public.room_players p JOIN public.rooms r ON r.id=p.room_id WHERE r.code=upper(_room) AND p.token=_token;
 IF me.id IS NULL THEN RAISE EXCEPTION 'No estás en esta sala'; END IF;
 SELECT * INTO target FROM public.room_players WHERE id=_target AND room_id=me.room_id;
 IF target.id IS NULL OR target.id=me.id THEN RAISE EXCEPTION 'Jugador no válido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(coalesce(me.user_id::text,me.id::text)));
 IF EXISTS(SELECT 1 FROM public.player_reports WHERE (reporter_player_id=me.id OR (me.user_id IS NOT NULL AND reporter_user_id=me.user_id)) AND created_at>now()-interval '1 minute') THEN RAISE EXCEPTION 'Espera un minuto antes de otro reporte'; END IF;
 IF EXISTS(SELECT 1 FROM public.player_reports WHERE reporter_player_id=me.id AND target_player_id=target.id AND status='pending') THEN RAISE EXCEPTION 'Ya tienes un reporte pendiente de este jugador'; END IF;
 INSERT INTO public.player_reports(room_code,reporter_player_id,target_player_id,reporter_user_id,target_user_id,target_name,reason,comment) VALUES(upper(_room),me.id,target.id,me.user_id,target.user_id,target.name,_reason,_comment) RETURNING id INTO rid;
 RETURN rid;
END $$;
CREATE FUNCTION public.resolve_player_report(_actor uuid,_report uuid,_action text,_reason text,_hours integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.player_reports; expiry timestamptz;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_actor AND role='admin') THEN RAISE EXCEPTION 'Acceso denegado'; END IF;
 SELECT * INTO r FROM public.player_reports WHERE id=_report FOR UPDATE;
 IF r.id IS NULL OR r.status<>'pending' THEN RAISE EXCEPTION 'El reporte ya no está pendiente'; END IF;
 IF _action NOT IN ('dismissed','suspended') OR length(trim(_reason)) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Indica un motivo válido'; END IF;
 IF _action='suspended' THEN
 IF _hours NOT IN (1,24,168) THEN RAISE EXCEPTION 'Duración no válida'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=r.target_user_id AND role='admin') THEN RAISE EXCEPTION 'No puedes suspender al administrador'; END IF;
 expiry:=now()+make_interval(hours=>_hours);
 INSERT INTO public.moderation_suspensions(user_id,player_id,until_at,report_id) VALUES(r.target_user_id,r.target_player_id,expiry,r.id);
 END IF;
 INSERT INTO public.moderation_decisions(report_id,actor_id,action,reason,until_at) VALUES(r.id,_actor,_action,trim(_reason),expiry);
 UPDATE public.player_reports SET status=_action,resolved_at=now() WHERE id=r.id;
END $$;
REVOKE ALL ON FUNCTION public.submit_player_report(text,text,uuid,text,text), public.resolve_player_report(uuid,uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_player_report(text,text,uuid,text,text), public.resolve_player_report(uuid,uuid,text,text,integer) TO service_role;