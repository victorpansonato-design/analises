/**
 * Handlers simulados: proposta (contrato `GET /casos/{id}/proposta`). As ações (enviar, registrar
 * resposta, efetivar) são transições e passam por `POST /casos/{id}/transicoes`.
 *
 * Regras que o mock aplica como o backend real:
 * - O resumo é o CONGELADO em `CONCLUIR_ANALISE`. Antes disso nenhum número sai (princípio 7).
 * - A condição financeira só vai para quem tem `VER_FINANCEIRO` (docs/04 §3); para os demais, `null`.
 * - A pendência financeira anterior sai só como sim/não (o valor nunca aparece aqui).
 */
import { http } from "msw";

import { MATRIZ } from "@/features/casos";
import type { Proposta } from "@/features/proposta";

import { calcularResumo } from "@/mocks/db/analise";
import { analiseDoCaso } from "@/mocks/db/repositorio";
import type { CasoRegistro } from "@/mocks/db/tipos";
import { API, ok } from "@/mocks/lib/http";
import { casoOu404, preparar } from "@/mocks/handlers/comum";
import { resumoUsuario, type UsuarioMock } from "@/mocks/seed/usuarios";

/** Monta a proposta como o contrato devolve, já filtrada pelo papel de quem pede. */
export function montarProposta(caso: CasoRegistro, usuario: Pick<UsuarioMock, "papeis">): Proposta {
   const congelado = !!caso.resumoCongeladoEm;
   // O resumo congelado é calculado sob demanda na primeira leitura da análise.
   if (congelado && !caso.resumoCongelado) {
      const analise = analiseDoCaso(caso);
      if (analise && !caso.resumoCongelado) caso.resumoCongelado = calcularResumo(analise);
   }
   const veFinanceiro = usuario.papeis.some(p => MATRIZ.VER_FINANCEIRO.includes(p));
   const { aceite } = caso.proposta;
   return {
      resumo: congelado ? caso.resumoCongelado : null,
      congeladoEm: caso.resumoCongeladoEm,
      financeiro: congelado && veFinanceiro ? caso.proposta.financeiro : null,
      pendenciaFinanceiraAnterior: caso.proposta.pendenciaFinanceiraAnterior,
      resposta: caso.proposta.resposta,
      aceite: aceite
         ? { canal: aceite.canal, em: aceite.em, por: resumoUsuario(aceite.porId) ?? { id: aceite.porId, nome: "Equipe de matrícula" } }
         : null,
      pdfUrl: null,
      enviadaEm: caso.proposta.enviadaEm,
   };
}

export const handlersProposta = [
   http.get(`${API}/casos/:casoId/proposta`, async ({ params }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      return ok(montarProposta(caso, ctx.usuario));
   }),
];
