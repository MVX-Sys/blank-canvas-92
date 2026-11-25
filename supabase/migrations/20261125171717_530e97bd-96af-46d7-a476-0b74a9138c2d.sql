DROP POLICY IF EXISTS "public read" ON public.atendentes;
CREATE POLICY "public read active" ON public.atendentes FOR SELECT USING (ativo = true OR public.is_staff(auth.uid()));