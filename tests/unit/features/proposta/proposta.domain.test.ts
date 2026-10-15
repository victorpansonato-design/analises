import { describe, expect, it } from "vitest";

import type { AcaoDisponivel } from "@/features/casos";
import {
   botaoDaProposta,
   celularValidoParaEnvio,
   deInputLocal,
   fracaoAproveitamento,
   guardasDoEnvio,
   paraInputLocal,
   podeEnviar,
   textoAproveitamento,
   textoPeriodoIngresso,
   textoPrevisao,
} from "@/features/proposta/domain/proposta";
import { aceiteFormSchema, RespostaFormSchema } from "@/features/proposta/types/proposta.schema";

const acao = (a: string, habilitada: boolean, motivos: string[] = []): AcaoDisponivel => ({
   acao: a,
   habilitada,
   motivos,
   exigeMotivo: false,
});

describe("botões da aba", () => {
   it("some quando a API não devolveu a ação", () => {
      expect(botaoDaProposta({ acoesDisponiveis: [] }, "ENVIAR_PROPOSTA")).toBeNull();
   });
   it("desabilitado traz o primeiro motivo", () => {
      const b = botaoDaProposta(
         { acoesDisponiveis: [acao("ENVIAR_PROPOSTA", false, ["A condição financeira ainda não foi carregada", "outro"])] },
         "ENVIAR_PROPOSTA",
      );
      expect(b).toMatchObject({ habilitada: false, motivo: "A condição financeira ainda não foi carregada", rotulo: "Enviar proposta" });
   });
   it("efetivar bloqueado mostra o motivo da API", () => {
      const b = botaoDaProposta(
         { acoesDisponiveis: [acao("EFETIVAR_MATRICULA", false, ["A análise ainda não foi concluída"])] },
         "EFETIVAR_MATRICULA",
      );
      expect(b).toMatchObject({ habilitada: false, motivo: "A análise ainda não foi concluída" });
   });
});

describe("guardas do envio", () => {
   const ok = { optInWhatsapp: true, celular: "(11) 98765-4321", financeiroCarregado: true, variaveisFaltando: [] as string[] };
   it("tudo certo libera o envio", () => {
      const g = guardasDoEnvio(ok);
      expect(podeEnviar(g)).toBe(true);
      expect(g.find(x => x.id === "celular")?.texto).toBe("Vai para o celular (11) 98765-4321");
   });
   it("sem opt-in bloqueia com explicação", () => {
      const g = guardasDoEnvio({ ...ok, optInWhatsapp: false });
      expect(podeEnviar(g)).toBe(false);
      expect(g.find(x => x.id === "optIn")?.texto).toContain("não autorizou contato pelo WhatsApp");
   });
   it("financeiro não carregado usa o texto da guarda da máquina", () => {
      expect(guardasDoEnvio({ ...ok, financeiroCarregado: false }).find(x => x.id === "financeiro")?.texto).toBe(
         "A condição financeira ainda não foi carregada",
      );
   });
   it("celular mascarado ou curto não serve", () => {
      expect(celularValidoParaEnvio("(11) *****-4321")).toBe(false);
      expect(celularValidoParaEnvio("1234")).toBe(false);
      expect(celularValidoParaEnvio(null)).toBe(false);
   });
   it("variável faltando na prévia vira guarda com lista sem vírgula antes do e", () => {
      const g = guardasDoEnvio({ ...ok, variaveisFaltando: ["disciplinas", "horas", "semestres"] });
      expect(podeEnviar(g)).toBe(false);
      expect(g.at(-1)?.texto).toBe("Faltam dados na mensagem: disciplinas aproveitadas, horas aproveitadas e previsão de semestres");
   });
});

describe("textos do resumo", () => {
   it("aproveitamento tem denominador e não divide por zero", () => {
      expect(fracaoAproveitamento({ chDispensada: 900, chTotalMatriz: 3000 })).toBeCloseTo(0.3);
      expect(textoAproveitamento({ chDispensada: 900, chTotalMatriz: 3000 })).toBe("30,0%");
      expect(textoAproveitamento({ chDispensada: 900, chTotalMatriz: 0 })).toBeNull();
   });
   it("previsão sempre diz estimativa", () => {
      expect(textoPrevisao(5)).toBe("Previsão: 5 semestres (estimativa)");
      expect(textoPrevisao(1)).toBe("Previsão: 1 semestre (estimativa)");
      expect(textoPrevisao(null)).toContain("estimativa");
   });
   it("período de ingresso usa o definido ou o sugerido", () => {
      expect(textoPeriodoIngresso({ periodoIngresso: 3, periodoIngressoSugerido: 2 })).toBe("3º período");
      expect(textoPeriodoIngresso({ periodoIngresso: null, periodoIngressoSugerido: 2 })).toBe("2º período");
      expect(textoPeriodoIngresso({ periodoIngresso: null, periodoIngressoSugerido: null })).toBeNull();
   });
});

describe("formulários", () => {
   it("resposta exige o tipo", () => {
      expect(RespostaFormSchema.safeParse({ tipo: null, texto: "" }).success).toBe(false);
      expect(RespostaFormSchema.safeParse({ tipo: "SEM_INTERESSE", texto: "" }).success).toBe(true);
   });
   it("aceite não pode ser no futuro e exige canal", () => {
      const agora = new Date(2026, 9, 9, 14, 0);
      const schema = aceiteFormSchema(() => agora);
      expect(schema.safeParse({ canal: "TELEFONE", em: paraInputLocal(agora) }).success).toBe(true);
      const futuro = schema.safeParse({ canal: "TELEFONE", em: paraInputLocal(new Date(2026, 9, 10, 9, 0)) });
      expect(futuro.success).toBe(false);
      expect(futuro.error?.issues[0].message).toBe("O aceite não pode estar no futuro");
      expect(schema.safeParse({ canal: null, em: paraInputLocal(agora) }).success).toBe(false);
   });
   it("data local vai e volta", () => {
      const d = new Date(2026, 9, 9, 8, 5);
      expect(paraInputLocal(d)).toBe("2026-10-09T08:05");
      expect(new Date(deInputLocal("2026-10-09T08:05")).getTime()).toBe(d.getTime());
   });
});
