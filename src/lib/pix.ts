// Gera o código "Pix Copia e Cola" (BR Code estático, padrão EMV do Banco Central).
function campo(id: string, valor: string) {
  return id + String(valor.length).padStart(2, "0") + valor;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const limpar = (s: string, max: number) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 ]/g, "").trim().slice(0, max).toUpperCase();

export function normalizarChave(tipo: string, chave: string) {
  const t = tipo.toLowerCase();
  if (t === "cpf" || t === "cnpj") return chave.replace(/\D/g, "");
  if (t === "telefone" || t === "celular" || t === "phone") {
    const d = chave.replace(/\D/g, "");
    return d.startsWith("55") ? `+${d}` : `+55${d}`;
  }
  if (t === "email") return chave.trim().toLowerCase();
  return chave.trim();
}

export function gerarPixCopiaECola(opts: {
  chave: string;
  nome: string;
  cidade?: string | null;
  valor: number;
  txid?: string;
}) {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", opts.chave);
  const txid = (opts.txid || "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const semCrc =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (opts.valor > 0 ? campo("54", opts.valor.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", limpar(opts.nome, 25) || "LOJA") +
    campo("60", limpar(opts.cidade || "BRASIL", 15) || "BRASIL") +
    campo("62", campo("05", txid)) +
    "6304";
  return semCrc + crc16(semCrc);
}
