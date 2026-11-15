CREATE OR REPLACE FUNCTION public.gerar_hash_produto() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base text; n int;
BEGIN
  IF NEW.hash_id IS NULL OR NEW.hash_id = '' THEN
    base := upper(regexp_replace(coalesce(NEW.codigo_base,'P'), '[^A-Za-z0-9]', '', 'g'));
    IF base = '' THEN base := 'P'; END IF;
    n := 1;
    LOOP
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.produtos WHERE hash_id = base || lpad(n::text, 3, '0') AND id <> NEW.id);
      n := n + 1;
    END LOOP;
    NEW.hash_id := base || lpad(n::text, 3, '0');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_gerar_hash_produto ON public.produtos;
CREATE TRIGGER trg_gerar_hash_produto BEFORE INSERT OR UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.gerar_hash_produto();
UPDATE public.produtos SET hash_id = NULL WHERE hash_id IS NULL OR hash_id = '';