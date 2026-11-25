ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS pagamento_status text NOT NULL DEFAULT 'aguardando',
  ADD COLUMN IF NOT EXISTS pix_txid text,
  ADD COLUMN IF NOT EXISTS pix_expira_em timestamptz,
  ADD COLUMN IF NOT EXISTS pix_informado_em timestamptz,
  ADD COLUMN IF NOT EXISTS pago_em timestamptz;
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_pagamento_status_chk CHECK (pagamento_status IN ('aguardando','em_analise','aprovado','recusado'));
CREATE UNIQUE INDEX IF NOT EXISTS pedidos_pix_txid_uk ON public.pedidos(pix_txid) WHERE pix_txid IS NOT NULL;

CREATE OR REPLACE FUNCTION public.informar_pagamento_pix(_pedido_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  SELECT * INTO p FROM public.pedidos WHERE id = _pedido_id FOR UPDATE;
  IF NOT FOUND OR p.user_id <> auth.uid() THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF p.status = 'cancelado' THEN RAISE EXCEPTION 'Pedido cancelado'; END IF;
  IF p.pagamento_status <> 'aguardando' THEN RETURN p.pagamento_status; END IF;
  IF p.pix_expira_em IS NOT NULL AND p.pix_expira_em < now() THEN RAISE EXCEPTION 'O prazo do Pix expirou'; END IF;
  UPDATE public.pedidos SET pagamento_status = 'em_analise', pix_informado_em = now() WHERE id = _pedido_id;
  RETURN 'em_analise';
END $$;

CREATE OR REPLACE FUNCTION public.confirmar_pagamento_pix(_pedido_id uuid, _aprovado boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO p FROM public.pedidos WHERE id = _pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF p.status = 'cancelado' THEN RAISE EXCEPTION 'Pedido cancelado'; END IF;
  IF p.pagamento_status = 'aprovado' THEN RAISE EXCEPTION 'Pagamento já aprovado'; END IF;
  IF _aprovado THEN
    UPDATE public.pedidos SET pagamento_status = 'aprovado', pago_em = now() WHERE id = _pedido_id;
    IF p.status = 'pendente' THEN PERFORM public.set_pedido_status(_pedido_id, 'confirmado'); END IF;
  ELSE
    UPDATE public.pedidos SET pagamento_status = 'recusado' WHERE id = _pedido_id;
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.informar_pagamento_pix(uuid), public.confirmar_pagamento_pix(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.informar_pagamento_pix(uuid), public.confirmar_pagamento_pix(uuid, boolean) TO authenticated;