import { describe, it, expect } from "vitest";
import { itemPrecoEfetivo, ehAtacado } from "./cart";
const item = { preco: 50, precoAtacado: 35, precoPromocional: null, promocaoAte: null, personalizacoes: [] };
describe("atacado x varejo", () => {
  it("9 peças = varejo", () => expect(itemPrecoEfetivo(item, ehAtacado(9))).toBe(50));
  it("10 peças = atacado", () => expect(itemPrecoEfetivo(item, ehAtacado(10))).toBe(35));
});
