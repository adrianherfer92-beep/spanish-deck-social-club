DROP POLICY IF EXISTS "Perfiles visibles" ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;
CREATE POLICY "Ver mi perfil" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);