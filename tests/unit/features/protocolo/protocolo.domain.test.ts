import { describe, expect, it } from "vitest";

import type { CasoResumo } from "@/features/casos";
import {
   ajustarDestino,
   casoDuplicado,
   FORM_VAZIO,
   mascaraCelular,
   mascaraCpf,
   montarNovoProtocolo,
   mostraEstudouFora,
   mostraOrigem,
   oQueVaiAcontecer,
   outrosCasosAtivos,
   proximoChecklistPendente,
   rascunhoTemConteudo,
   resumoFalhasUpload,
   sugerirTipo,
} from "@/features/protocolo/domain/protocolo";
import { cpfValido, NovoProtocoloFormSchema, type NovoProtocoloForm } from "@/features/protocolo/types/protocolo.schema";

// CPF fictício de exemplo (dígitos verificadores corretos).
const CPF = "12345678909";

const caso = (id: string, cursoId: string): CasoResumo =>
   ({ id, destino: { cursoId, cursoNome: `Curso ${cursoId}` } }) as unknown as CasoResumo;

describe("máscaras", () => {
   it("formata o CPF enquanto digita, guardando só dígitos", () => {
      expect(mascaraCpf("123")).toBe("123");
      expect(mascaraCpf("1234")).toBe("123.4");
      expect(mascaraCpf("1234567")).toBe("123.456.7");
      expect(mascaraCpf("12345678909")).toBe("123.456.789-09");
      expect(mascaraCpf("123.456.789-0999")).toBe("123.456.789-09");
   });

   it("formata o celular com 10 ou 11 dígitos", () => {
      expect(mascaraCelular("")).toBe("");
      expect(mascaraCelular("11")).toBe("(11");
      expect(mascaraCelular("119876")).toBe("(11) 9876");
      expect(mascaraCelular("1198765432")).toBe("(11) 9876-5432");
      expect(mascaraCelular("11987654321")).toBe("(11) 98765-4321");
   });

   it("valida o dígito verificador do CPF", () => {
      expect(cpfValido(CPF)).toBe(true);
      expect(cpfValido("11111111111")).toBe(false);
      expect(cpfValido("12345678900")).toBe(false);
   });
});

describe("sugestão de tipo pelo vínculo", () => {
   it("ex-aluno sugere retorno com o porquê", () => {
      const s = sugerirTipo({
         vinculo: "EX_ALUNO",
         tipoSugerido: null,
         pessoa: { pessoaId: "p", nome: "Pessoa Teste", celular: null, email: null, ra: "1000001" },
      });
      expect(s?.tipo).toBe("RETORNO");
      expect(s?.porque).toContain("RA 1000001");
   });
   it("aluno ativo sugere transferência interna", () => {
      expect(sugerirTipo({ vinculo: "ALUNO_ATIVO", tipoSugerido: null, pessoa: null })?.tipo).toBe("TRANSFERENCIA_INTERNA");
   });
   it("sem vínculo e sem sugestão não sugere nada", () => {
      expect(sugerirTipo({ vinculo: "NENHUM", tipoSugerido: null, pessoa: null })).toBeNull();
   });
   it("respeita o tipo sugerido pela API", () => {
      expect(sugerirTipo({ vinculo: "EX_ALUNO", tipoSugerido: "TRANSFERENCIA_INTERNA", pessoa: null })?.tipo).toBe("TRANSFERENCIA_INTERNA");
   });
});

describe("caso duplicado", () => {
   const lookup = { casosAtivos: [caso("c1", "adm"), caso("c2", "dir")] };
   it("bloqueia só o mesmo curso", () => {
      expect(casoDuplicado(lookup, "adm")?.id).toBe("c1");
      expect(casoDuplicado(lookup, "eng")).toBeNull();
      expect(casoDuplicado(lookup, "")).toBeNull();
      expect(casoDuplicado(null, "adm")).toBeNull();
   });
   it("lista os outros casos ativos como aviso", () => {
      expect(outrosCasosAtivos(lookup, "adm").map(c => c.id)).toEqual(["c2"]);
   });
});

describe("campos condicionais", () => {
   it("origem só em externa e diploma", () => {
      expect(mostraOrigem("TRANSFERENCIA_EXTERNA")).toBe(true);
      expect(mostraOrigem("PORTADOR_DIPLOMA")).toBe(true);
      expect(mostraOrigem("TRANSFERENCIA_INTERNA")).toBe(false);
      expect(mostraOrigem("RETORNO")).toBe(false);
   });
   it("estudou fora só em retorno sem vínculo", () => {
      expect(mostraEstudouFora("RETORNO", "SEM_VINCULO")).toBe(true);
      expect(mostraEstudouFora("RETORNO", "COM_VINCULO_ALTERACAO_CURRICULAR")).toBe(false);
      expect(mostraEstudouFora("TRANSFERENCIA_EXTERNA", "SEM_VINCULO")).toBe(false);
   });
   it("turno e modalidade ficam restritos ao curso e opção única já vem escolhida", () => {
      expect(ajustarDestino({ turnos: ["NOTURNO"], modalidades: ["PRESENCIAL", "EAD"] }, "MATUTINO", "EAD")).toEqual({
         turno: "NOTURNO",
         modalidade: "EAD",
      });
      expect(ajustarDestino({ turnos: ["NOTURNO", "MATUTINO"], modalidades: ["EAD"] }, "VESPERTINO", null)).toEqual({
         turno: null,
         modalidade: "EAD",
      });
      expect(ajustarDestino(undefined, "NOTURNO", "EAD")).toEqual({ turno: null, modalidade: null });
   });
});

describe("o que vai acontecer", () => {
   it("externa com opt-in avisa do WhatsApp com a lista de documentos", () => {
      expect(oQueVaiAcontecer({ tipo: "TRANSFERENCIA_EXTERNA", subtipo: null, estudouForaNoPeriodo: null, optInWhatsapp: true })).toBe(
         "Vamos enviar ao candidato, pelo WhatsApp, a lista de documentos. Você será avisado se precisar agir.",
      );
   });
   it("interna e retorno sem estudo externo começam a pré-análise sozinhos", () => {
      expect(oQueVaiAcontecer({ tipo: "TRANSFERENCIA_INTERNA", subtipo: null, estudouForaNoPeriodo: null, optInWhatsapp: true })).toContain(
         "pré-análise começa sozinha",
      );
      expect(oQueVaiAcontecer({ tipo: "RETORNO", subtipo: "SEM_VINCULO", estudouForaNoPeriodo: false, optInWhatsapp: true })).toContain(
         "pré-análise começa sozinha",
      );
      expect(oQueVaiAcontecer({ tipo: "RETORNO", subtipo: "SEM_VINCULO", estudouForaNoPeriodo: true, optInWhatsapp: true })).toContain(
         "lista de documentos",
      );
   });
   it("sem opt-in avisa que nenhuma mensagem sai", () => {
      expect(oQueVaiAcontecer({ tipo: "PORTADOR_DIPLOMA", subtipo: null, estudouForaNoPeriodo: null, optInWhatsapp: false })).toContain(
         "nenhuma mensagem sai",
      );
   });
});

describe("payload do POST /casos", () => {
   const base: NovoProtocoloForm = {
      ...FORM_VAZIO,
      cpf: CPF,
      nome: "  Maria   Teste  Ficticia ",
      celular: "11987654321",
      email: "",
      cursoId: "adm",
      turno: "NOTURNO",
      modalidade: "PRESENCIAL",
      iesNome: "Faculdade Exemplo",
      cursoOrigemNome: "Economia",
      iesId: "ies-1",
   };
   const curso = { id: "adm", nome: "Administração" };

   it("monta externa com origem, ciclo 2027.1 e enviar", () => {
      expect(montarNovoProtocolo(base, curso)).toMatchObject({
         cpf: CPF,
         nome: "Maria Teste Ficticia",
         email: null,
         subtipo: null,
         estudouForaNoPeriodo: null,
         destino: {
            cursoId: "adm",
            cursoNome: "Administração",
            turno: "NOTURNO",
            modalidade: "PRESENCIAL",
            matrizId: null,
            ciclo: "2027.1",
         },
         origem: { iesId: "ies-1", iesNome: "Faculdade Exemplo", cursoNome: "Economia" },
         enviar: true,
      });
   });

   it("interna descarta a origem digitada", () => {
      expect(montarNovoProtocolo({ ...base, tipo: "TRANSFERENCIA_INTERNA" }, curso).origem).toEqual({
         iesId: null,
         iesNome: null,
         cursoNome: null,
      });
   });

   it("retorno sem vínculo leva estudouFora; com vínculo não", () => {
      expect(
         montarNovoProtocolo({ ...base, tipo: "RETORNO", subtipo: "SEM_VINCULO", estudouForaNoPeriodo: true }, curso).estudouForaNoPeriodo,
      ).toBe(true);
      const com = montarNovoProtocolo(
         { ...base, tipo: "RETORNO", subtipo: "COM_VINCULO_ALTERACAO_CURRICULAR", estudouForaNoPeriodo: true },
         curso,
      );
      expect(com.estudouForaNoPeriodo).toBeNull();
      expect(com.subtipo).toBe("COM_VINCULO_ALTERACAO_CURRICULAR");
   });

   it("o formulário exige origem em externa e subtipo em retorno", () => {
      const r1 = NovoProtocoloFormSchema.safeParse({ ...base, iesNome: "" });
      expect(r1.error?.issues.some(i => i.path[0] === "iesNome")).toBe(true);
      const r2 = NovoProtocoloFormSchema.safeParse({ ...base, tipo: "RETORNO", subtipo: null });
      expect(r2.error?.issues.some(i => i.path[0] === "subtipo")).toBe(true);
      expect(NovoProtocoloFormSchema.safeParse(base).success).toBe(true);
   });
});

describe("rascunho e anexos", () => {
   it("só guarda rascunho com algo digitado", () => {
      expect(rascunhoTemConteudo(FORM_VAZIO)).toBe(false);
      expect(rascunhoTemConteudo({ ...FORM_VAZIO, nome: "Ana" })).toBe(true);
      expect(rascunhoTemConteudo(null)).toBe(false);
   });
   it("cada arquivo vai para o próximo item pendente", () => {
      const itens = [
         { id: "a", status: "ACEITO" as const },
         { id: "b", status: "PENDENTE" as const },
         { id: "c", status: "RECUSADO" as const },
      ];
      expect(proximoChecklistPendente(itens, new Set())).toBe("b");
      expect(proximoChecklistPendente(itens, new Set(["b"]))).toBe("c");
      expect(proximoChecklistPendente(itens, new Set(["b", "c"]))).toBeNull();
   });
   it("explica as falhas sem vírgula antes do e", () => {
      expect(resumoFalhasUpload(["a.pdf"])).toBe("O arquivo a.pdf não foi anexado.");
      expect(resumoFalhasUpload(["a.pdf", "b.pdf", "c.pdf"])).toBe("Os arquivos a.pdf, b.pdf e c.pdf não foram anexados.");
   });
});
