import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { itemPrecoEfetivo, ehAtacado } from "./cart";
const item = { preco: 50, precoAtacado: 35, precoPromocional: null, promocaoAte: null, personalizacoes: [] };
describe("atacado x varejo", () => {
  test("9 pecas = varejo", () => assert.equal(itemPrecoEfetivo(item, ehAtacado(9)), 50));
  test("10 pecas = atacado", () => assert.equal(itemPrecoEfetivo(item, ehAtacado(10)), 35));
});
