/**
 * Gestão comercial simulada: rendimento da equipe de vendas por mês e metas mensais editáveis.
 * Só quem tem `VER_GESTAO` (papel GESTAO) recebe; os outros papéis levam 403.
 *
 * - Volume do mês: `seed/desempenho.ts` (determinístico). No mês corrente, só até hoje.
 * - Carteira ativa: os casos simulados em andamento de cada consultor.
 * - Meta: a definida pela gestão (`db.metas`) ou a da semente. `If-Match` protege a edição.
 */
import { http } from "msw";

import { ETAPAS_DO_FUNIL, METAS, temCapacidade, type Etapa } from "@/features/casos";
import { diasAteHoje, mesDe, progressoDoMes, type ConsultorDesempenho, type Equipe } from "@/features/gestao";

import { preparar } from "@/mocks/handlers/comum";
import { ehTeste } from "@/mocks/handlers/indicadores";
import { db } from "@/mocks/db/estado";
import { API, erro, ok, versaoPedida } from "@/mocks/lib/http";
import { desempenhoDoMes } from "@/mocks/seed/desempenho";
import { CONSULTORES, resumoUsuario } from "@/mocks/seed/usuarios";

const ATIVAS = ETAPAS_DO_FUNIL as readonly Etapa[];

/** Os N meses até `mes`, do mais recente ao mais antigo. */
export function mesesAte(mes: string, quantos: number): string[] {
   const [ano, m] = mes.split("-").map(Number);
   return Array.from({ length: quantos }, (_, i) => {
      const d = new Date(Date.UTC(ano, m - 1 - i, 1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
   });
}

function metaDe(consultorId: string, mes: string): { meta: number; versao: number } {
   const definida = db.metas.get(`${consultorId}|${mes}`);
   return definida ? { meta: definida.meta, versao: definida.versao } : { meta: desempenhoDoMes(consultorId, mes).metaSemente, versao: 1 };
}

/** O mês de um consultor, lido em `agora` (mês corrente corta no dia de hoje). */
function lerMes(consultorId: string, mes: string, agora: Date) {
   const d = desempenhoDoMes(consultorId, mes);
   const p = progressoDoMes(mes, agora);
   const porDia = d.porDia.slice(0, p.fechado ? d.porDia.length : diasAteHoje(mes, agora));
   const parte = p.total > 0 ? p.decorridos / p.total : 1;
   const matriculas = porDia.reduce((s, v) => s + v, 0);
   const proporcional = (n: number) => Math.max(matriculas, Math.round(n * parte));
   return {
      porDia,
      matriculas,
      protocolosAbertos: Math.round(d.protocolosAbertos * parte),
      propostasEnviadas: proporcional(d.propostasEnviadas),
      analisesConcluidas: proporcional(d.analisesConcluidas),
      primeiroContatoHoras: matriculas > 0 ? d.primeiroContatoHoras : null,
   };
}

function carteiraDe(consultorId: string): ConsultorDesempenho["carteira"] {
   const porEtapa = new Map<Etapa, number>();
   for (const c of db.casos.values()) {
      if (c.responsaveis.consultorId !== consultorId || !ATIVAS.includes(c.etapa) || ehTeste(c)) continue;
      porEtapa.set(c.etapa, (porEtapa.get(c.etapa) ?? 0) + 1);
   }
   return ATIVAS.filter(e => porEtapa.has(e)).map(etapa => ({ etapa, total: porEtapa.get(etapa) ?? 0 }));
}

export function montarEquipe(mes: string, agora: Date): Equipe {
   const historico = mesesAte(mes, METAS.mesesDeHistorico).reverse();
   return {
      mes,
      mesesDisponiveis: mesesAte(mesDe(agora), METAS.mesesDeHistorico),
      geradoEm: agora.toISOString(),
      consultores: CONSULTORES.map(u => {
         const leitura = lerMes(u.id, mes, agora);
         const { meta, versao } = metaDe(u.id, mes);
         return {
            id: u.id,
            nome: u.nome,
            meta,
            versaoMeta: versao,
            matriculas: leitura.matriculas,
            matriculasPorDia: leitura.porDia,
            protocolosAbertos: leitura.protocolosAbertos,
            propostasEnviadas: leitura.propostasEnviadas,
            analisesConcluidas: leitura.analisesConcluidas,
            primeiroContatoHoras: leitura.primeiroContatoHoras,
            carteira: carteiraDe(u.id),
            historico: historico.map(h => ({ mes: h, meta: metaDe(u.id, h).meta, matriculas: lerMes(u.id, h, agora).matriculas })),
         };
      }),
   };
}

export const handlersGestao = [
   http.get(`${API}/gestao/equipe`, async ({ request }) => {
      const ctx = await preparar();
      if (!temCapacidade(ctx.usuario.papeis, "VER_GESTAO")) return erro(403, "SEM_PERMISSAO", "Área restrita à gestão comercial.");
      const pedido = new URL(request.url).searchParams.get("mes");
      const disponiveis = mesesAte(mesDe(ctx.agora), METAS.mesesDeHistorico);
      const mes = pedido ?? disponiveis[0];
      if (!disponiveis.includes(mes)) return erro(400, "MES_INVALIDO", "Escolha um dos últimos seis meses.");
      return ok(montarEquipe(mes, ctx.agora));
   }),

   http.put(`${API}/gestao/metas`, async ({ request }) => {
      const ctx = await preparar();
      if (!temCapacidade(ctx.usuario.papeis, "VER_GESTAO")) return erro(403, "SEM_PERMISSAO", "Só a gestão comercial define metas.");
      const corpo = (await request.json()) as { consultorId: string; mes: string; meta: number };
      if (!CONSULTORES.some(c => c.id === corpo.consultorId)) return erro(404, "NAO_ENCONTRADO", "Consultor não encontrado.");
      if (corpo.mes < mesDe(ctx.agora)) return erro(422, "MES_FECHADO", "O mês já fechou: a meta dele não muda mais.");
      if (!Number.isInteger(corpo.meta) || corpo.meta < 0 || corpo.meta > 200)
         return erro(422, "META_INVALIDA", "A meta precisa ser um número inteiro de 0 a 200.");
      const chave = `${corpo.consultorId}|${corpo.mes}`;
      const atual = metaDe(corpo.consultorId, corpo.mes);
      const pedida = versaoPedida(request);
      if (pedida !== null && pedida !== atual.versao) {
         const autor = db.metas.get(chave)?.atualizadoPorId;
         return erro(409, "VERSAO_DESATUALIZADA", "A meta foi alterada por outra pessoa.", {
            atualizadoPor: resumoUsuario(autor) ?? { id: "u-sistema", nome: "outra pessoa" },
         });
      }
      db.metas.set(chave, { meta: corpo.meta, versao: atual.versao + 1, atualizadoPorId: ctx.usuario.id });
      return ok({ consultorId: corpo.consultorId, mes: corpo.mes, meta: corpo.meta, versao: atual.versao + 1 });
   }),
];
