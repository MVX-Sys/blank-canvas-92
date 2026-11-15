ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_atacado numeric;
CREATE OR REPLACE FUNCTION public.validar_preco_atacado() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.preco_atacado IS NOT NULL AND (NEW.preco_atacado <= 0 OR NEW.preco_atacado >= NEW.preco) THEN
    RAISE EXCEPTION 'O preço de atacado precisa ser maior que zero e menor que o preço de varejo.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validar_preco_atacado ON public.produtos;
CREATE TRIGGER trg_validar_preco_atacado BEFORE INSERT OR UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.validar_preco_atacado();