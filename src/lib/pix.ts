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

// ---------- Validações (padrão de grandes varejistas) ----------
export const PIX_VALIDADE_MIN = 30; // minutos para pagar
export const PIX_VALOR_MAX = 999999.99;

function cpfValido(d: string) {
  if (!/^\d{11}$/.test(d) || /^(\d)\1+$/.test(d)) return false;
  const dv = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

function cnpjValido(d: string) {
  if (!/^\d{14}$/.test(d) || /^(\d)\1+$/.test(d)) return false;
  const dv = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = pesos.reduce((a, p, i) => a + Number(d[i]) * p, 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

/** Retorna mensagem de erro, ou null se a chave for válida. */
export function validarChavePix(tipo: string, chave: string): string | null {
  const t = tipo.toLowerCase();
  const v = chave.trim();
  if (!v) return "Informe a chave Pix";
  if (t === "cpf") return cpfValido(v.replace(/\D/g, "")) ? null : "CPF inválido";
  if (t === "cnpj") return cnpjValido(v.replace(/\D/g, "")) ? null : "CNPJ inválido";
  if (t === "telefone" || t === "celular" || t === "phone") {
    const n = normalizarChave("telefone", v);
    return /^\+55\d{10,11}$/.test(n) ? null : "Telefone inválido (use DDD + número)";
  }
  if (t === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 77 ? null : "E-mail inválido";
  if (t === "aleatoria" || t === "evp")
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? null : "Chave aleatória inválida";
  return "Tipo de chave desconhecido";
}

export function validarValorPix(valor: number): string | null {
  if (!Number.isFinite(valor) || valor < 0.01) return "Valor do Pix inválido";
  if (valor > PIX_VALOR_MAX) return "Valor acima do limite do Pix";
  return null;
}

/** Identificador da transação: só letras/números, até 25 caracteres (regra do Banco Central). */
export function txidDoPedido(pedidoId: string) {
  return ("IS" + pedidoId.replace(/[^A-Za-z0-9]/g, "")).slice(0, 25).toUpperCase();
}
