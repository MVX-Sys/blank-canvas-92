import { test } from "node:test";
import assert from "node:assert/strict";
import { validarChavePix, validarValorPix, txidDoPedido } from "./pix";

test("CPF com dígito errado é recusado", () => {
  assert.equal(validarChavePix("cpf", "529.982.247-25"), null);
  assert.notEqual(validarChavePix("cpf", "529.982.247-24"), null);
});
test("CNPJ válido aceito", () => {
  assert.equal(validarChavePix("cnpj", "11.222.333/0001-81"), null);
  assert.notEqual(validarChavePix("cnpj", "11.222.333/0001-80"), null);
});
test("valor zero não gera Pix", () => {
  assert.notEqual(validarValorPix(0), null);
  assert.equal(validarValorPix(79.9), null);
});
test("txid tem no máximo 25 caracteres alfanuméricos", () => {
  const t = txidDoPedido("d2891a56-369e-4082-b2d7-d1873009905d");
  assert.ok(t.length <= 25 && /^[A-Z0-9]+$/.test(t));
});
