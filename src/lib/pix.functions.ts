import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { gerarPixCopiaECola, normalizarChave, validarChavePix, validarValorPix } from "@/lib/pix";

export type PixPedido = {
  pedidoId: string;
  valor: number;
  codigo: string;
  txid: string;
  expiraEm: string | null;
  pagamentoStatus: "aguardando" | "em_analise" | "aprovado" | "recusado" | "expirado" | "cancelado";
  recebedor: string;
  banco: string | null;
};

// Valor e chave vêm sempre do servidor: o navegador não consegue alterar o que será cobrado.
export const getPixPedido = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }): Promise<PixPedido> => {
    const sb = context.supabase as any;
    const { data: p, error } = await sb
      .from("pedidos")
      .select("id, user_id, total, status, pagamento_status, pix_txid, pix_expira_em")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !p || p.user_id !== context.userId) throw new Error("Pedido não encontrado.");
    if (!p.pix_txid) throw new Error("Este pedido não é pago por Pix.");

    const { data: chaves } = await sb
      .from("pix_chaves")
      .select("tipo, chave, nome_recebedor, cidade, banco")
      .eq("ativo", true)
      .order("principal", { ascending: false })
      .limit(1);
    const k = chaves?.[0];
    if (!k) throw new Error("A loja ainda não tem chave Pix ativa.");
    const errChave = validarChavePix(k.tipo, k.chave);
    if (errChave) throw new Error("Chave Pix da loja inválida. Fale com o atendente.");
    const valor = Number(p.total);
    const errValor = validarValorPix(valor);
    if (errValor) throw new Error(errValor);

    let st: PixPedido["pagamentoStatus"] = p.pagamento_status;
    if (p.status === "cancelado") st = "cancelado";
    else if (st === "aguardando" && p.pix_expira_em && new Date(p.pix_expira_em).getTime() < Date.now()) st = "expirado";

    return {
      pedidoId: p.id,
      valor,
      txid: p.pix_txid,
      expiraEm: p.pix_expira_em,
      pagamentoStatus: st,
      recebedor: k.nome_recebedor,
      banco: k.banco,
      codigo: gerarPixCopiaECola({
        chave: normalizarChave(k.tipo, k.chave),
        nome: k.nome_recebedor,
        cidade: k.cidade,
        valor,
        txid: p.pix_txid,
      }),
    };
  });

export const informarPagamentoPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("informar_pagamento_pix", { _pedido_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const confirmarPagamentoPix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), aprovado: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("confirmar_pagamento_pix", {
      _pedido_id: data.id,
      _aprovado: data.aprovado,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
