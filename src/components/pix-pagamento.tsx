import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, MessageCircle, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { gerarPixCopiaECola, normalizarChave } from "@/lib/pix";

export type ChavePix = { tipo: string; chave: string; nome_recebedor: string; cidade: string | null; banco: string | null };

export function PixPagamento({
  chave, valor, txid, onWhatsapp,
}: { chave: ChavePix; valor: number; txid: string; onWhatsapp: () => void }) {
  const codigo = gerarPixCopiaECola({
    chave: normalizarChave(chave.tipo, chave.chave),
    nome: chave.nome_recebedor,
    cidade: chave.cidade,
    valor,
    txid,
  });
  const [qr, setQr] = useState<string>("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(codigo, { margin: 1, width: 480 }).then(setQr).catch(() => setQr(""));
  }, [codigo]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      toast.success("Código Pix copiado!");
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
          <Check className="h-3 w-3" /> Pedido registrado
        </span>
        <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">Pague com Pix</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escaneie o QR Code ou copie o código no app do seu banco.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Valor</span>
          <span className="font-display text-2xl font-bold">{brl(valor)}</span>
        </div>
        <div className="mt-4 flex justify-center">
          <div className="rounded-xl bg-background p-3 shadow-sm">
            {qr ? (
              <img src={qr} alt="QR Code Pix" className="h-48 w-48" />
            ) : (
              <div className="grid h-48 w-48 place-items-center text-muted-foreground"><QrCode className="h-10 w-10" /></div>
            )}
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Recebedor: <span className="font-semibold text-foreground">{chave.nome_recebedor}</span>
          {chave.banco ? ` · ${chave.banco}` : ""}
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pix copia e cola</p>
        <div className="flex gap-2">
          <input readOnly value={codigo} onFocus={(e) => e.currentTarget.select()} className="input flex-1 truncate font-mono text-[11px]" />
          <button type="button" onClick={copiar} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground">
            {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>

      <button type="button" onClick={onWhatsapp} className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3.5 text-sm font-bold text-background">
        <MessageCircle className="h-4 w-4" /> Já paguei · enviar comprovante no WhatsApp
      </button>
      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Prefere confirmar o frete antes? Fale com o atendente primeiro e pague depois.
      </p>
    </div>
  );
}
