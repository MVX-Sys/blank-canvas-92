import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Check, CheckCircle2, Clock, Copy, Loader2, MessageCircle, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { getPixPedido, informarPagamentoPix } from "@/lib/pix.functions";

export type ChavePix = { tipo: string; chave: string; nome_recebedor: string; cidade: string | null; banco: string | null };

function useRestante(expiraEm: string | null | undefined) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!expiraEm) return null;
  return Math.max(0, Math.floor((new Date(expiraEm).getTime() - agora) / 1000));
}

export function PixPagamento({ pedidoId, onWhatsapp }: { pedidoId: string; onWhatsapp: () => void }) {
  const fetchPix = useServerFn(getPixPedido);
  const informar = useServerFn(informarPagamentoPix);
  const qc = useQueryClient();
  const { data: pix, error, isLoading } = useQuery({
    queryKey: ["pix-pedido", pedidoId],
    queryFn: () => fetchPix({ data: { id: pedidoId } }),
    refetchInterval: (q) => {
      const s = q.state.data?.pagamentoStatus;
      return s === "aguardando" || s === "em_analise" ? 8000 : false;
    },
  });
  const [qr, setQr] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const restante = useRestante(pix?.expiraEm);
  const expirado = pix?.pagamentoStatus === "expirado" || (pix?.pagamentoStatus === "aguardando" && restante === 0);

  useEffect(() => {
    if (!pix?.codigo) return;
    QRCode.toDataURL(pix.codigo, { margin: 1, width: 480, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(""));
  }, [pix?.codigo]);

  if (isLoading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !pix)
    return (
      <div className="space-y-4 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
        <p className="text-sm">{(error as Error)?.message || "Não foi possível gerar o Pix."}</p>
        <button type="button" onClick={onWhatsapp} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">Falar com o atendente</button>
      </div>
    );

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(pix.codigo);
      setCopiado(true);
      toast.success("Código Pix copiado!");
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  };

  const jaPaguei = async () => {
    setEnviando(true);
    try {
      await informar({ data: { id: pedidoId } });
      await qc.invalidateQueries({ queryKey: ["pix-pedido", pedidoId] });
      onWhatsapp();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível registrar o aviso de pagamento.");
    } finally {
      setEnviando(false);
    }
  };

  const mm = restante != null ? String(Math.floor(restante / 60)).padStart(2, "0") : "--";
  const ss = restante != null ? String(restante % 60).padStart(2, "0") : "--";
  const pedidoCurto = pedidoId.slice(0, 8).toUpperCase();

  if (pix.pagamentoStatus === "aprovado")
    return (
      <div className="space-y-3 py-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h2 className="font-display text-xl font-semibold">Pagamento aprovado!</h2>
        <p className="text-sm text-muted-foreground">Pedido #{pedidoCurto} · {brl(pix.valor)}. Já estamos separando suas peças.</p>
      </div>
    );

  if (pix.pagamentoStatus === "em_analise")
    return (
      <div className="space-y-4 py-4 text-center">
        <Clock className="mx-auto h-10 w-10 text-primary" />
        <h2 className="font-display text-xl font-semibold">Pagamento em análise</h2>
        <p className="text-sm text-muted-foreground">Recebemos seu aviso do pedido #{pedidoCurto}. Assim que o atendente conferir, esta tela muda para aprovado.</p>
        <button type="button" onClick={onWhatsapp} className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3 text-sm font-bold text-background">
          <MessageCircle className="h-4 w-4" /> Enviar comprovante ao atendente
        </button>
      </div>
    );

  if (pix.pagamentoStatus === "recusado" || pix.pagamentoStatus === "cancelado" || expirado)
    return (
      <div className="space-y-4 py-4 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
        <h2 className="font-display text-xl font-semibold">
          {pix.pagamentoStatus === "recusado" ? "Pagamento não identificado" : pix.pagamentoStatus === "cancelado" ? "Pedido cancelado" : "O prazo do Pix acabou"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {expirado ? "Não pague este código. " : ""}Fale com o atendente para receber um novo Pix ou resolver o pedido #{pedidoCurto}.
        </p>
        <button type="button" onClick={onWhatsapp} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">Falar com o atendente</button>
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
          <Check className="h-3 w-3" /> Pedido #{pedidoCurto} registrado
        </span>
        <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">Pague com Pix</h2>
        <p className="mt-1 text-sm text-muted-foreground">Abra o app do seu banco, escaneie o QR Code ou use o copia e cola.</p>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-2 text-sm">
        <Clock className="h-4 w-4 text-primary" />
        <span>Pague em <strong className="font-mono">{mm}:{ss}</strong></span>
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Valor</span>
          <span className="font-display text-2xl font-bold">{brl(pix.valor)}</span>
        </div>
        <div className="mt-4 flex justify-center">
          <div className="rounded-xl bg-background p-3 shadow-sm">
            {qr ? <img src={qr} alt="QR Code Pix" className="h-48 w-48" /> : <div className="grid h-48 w-48 place-items-center text-muted-foreground"><QrCode className="h-10 w-10" /></div>}
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Confira no app: <span className="font-semibold text-foreground">{pix.recebedor}</span>
          {pix.banco ? ` · ${pix.banco}` : ""}
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pix copia e cola</p>
        <div className="flex gap-2">
          <input readOnly value={pix.codigo} onFocus={(e) => e.currentTarget.select()} className="input flex-1 truncate font-mono text-[11px]" />
          <button type="button" onClick={copiar} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground">
            {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>

      <ol className="space-y-1 text-xs text-muted-foreground">
        <li>1. Pague o valor exato, sem alterar o código.</li>
        <li>2. Toque em "Já paguei" e envie o comprovante.</li>
        <li>3. Esta tela atualiza sozinha quando o pagamento for aprovado.</li>
      </ol>

      <button type="button" disabled={enviando} onClick={jaPaguei} className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3.5 text-sm font-bold text-background disabled:opacity-60">
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />} Já paguei · enviar comprovante
      </button>
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Prefere confirmar o frete antes? Fale com o atendente e pague depois, dentro do prazo.
      </p>
    </div>
  );
}
