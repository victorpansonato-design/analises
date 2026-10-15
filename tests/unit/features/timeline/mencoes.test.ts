/** @menção nas notas internas: extração, destaque e autocomplete. Nomes fictícios. */
import { describe, expect, it } from "vitest";

import { consultaMencao, extrairMencoes, inserirMencao, segmentarMencoes, sugerirPessoas } from "@/features/timeline";

const PESSOAS = [
   { id: "u1", nome: "Juliana Prado" },
   { id: "u2", nome: "Fábio Guimarães" },
   { id: "u3", nome: "Fábio Lacerda" },
   { id: "u4", nome: "Rafaela Nogueira" },
];

describe("extrairMencoes", () => {
   it("nome completo menciona; sem acento e sem caixa também", () => {
      expect(extrairMencoes("@Juliana Prado pode ver?", PESSOAS)).toEqual(["u1"]);
      expect(extrairMencoes("cc @fabio guimaraes", PESSOAS)).toEqual(["u2"]);
   });
   it("primeiro nome só vale quando é único", () => {
      expect(extrairMencoes("@Juliana, confere?", PESSOAS)).toEqual(["u1"]);
      expect(extrairMencoes("@Fábio confere?", PESSOAS)).toEqual([]);
   });
   it("sem repetição, na ordem em que aparecem; e-mail não é menção", () => {
      expect(extrairMencoes("@Rafaela e @Juliana Prado e de novo @Rafaela Nogueira", PESSOAS)).toEqual(["u4", "u1"]);
      expect(extrairMencoes("escreva para juliana@example.com", PESSOAS)).toEqual([]);
   });
   it("não confunde prefixo de outra palavra", () => {
      expect(extrairMencoes("@Julianaa", PESSOAS)).toEqual([]);
   });
});

describe("segmentarMencoes", () => {
   it("destaca só as menções", () => {
      expect(segmentarMencoes("Oi @Juliana Prado, tudo certo", PESSOAS)).toEqual([
         { texto: "Oi ", mencao: false },
         { texto: "@Juliana Prado", mencao: true },
         { texto: ", tudo certo", mencao: false },
      ]);
   });
});

describe("autocomplete", () => {
   it("detecta o @ em digitação no cursor", () => {
      expect(consultaMencao("fala com @jul")).toEqual({ inicio: 9, termo: "jul" });
      expect(consultaMencao("@")).toEqual({ inicio: 0, termo: "" });
      expect(consultaMencao("email@dom")).toBeNull();
      expect(consultaMencao("@Juliana Prado ")).toBeNull();
   });
   it("sugere por primeiro nome ou sobrenome, sem acento", () => {
      expect(sugerirPessoas(PESSOAS, "fab").map(p => p.id)).toEqual(["u2", "u3"]);
      expect(sugerirPessoas(PESSOAS, "guim").map(p => p.id)).toEqual(["u2"]);
   });
   it("insere o nome completo e põe o cursor depois", () => {
      const r = inserirMencao("fala com @jul", 9, 13, PESSOAS[0]);
      expect(r).toEqual({ texto: "fala com @Juliana Prado ", cursor: 24 });
      expect(extrairMencoes(r.texto, PESSOAS)).toEqual(["u1"]);
   });
});
