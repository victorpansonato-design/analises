/**
 * Variáveis dos templates preenchidas a partir do caso (o candidato vê exatamente isto). Números de
 * aproveitamento só existem depois do resumo congelado: antes disso a variável fica vazia e o envio
 * é bloqueado (docs/00 princípio 7).
 */
import { int, lista } from "@/lib/format";

import { ROTULO_TIPO_CANDIDATO, SLA_POR_ETAPA } from "@/features/casos";

import { primeiroNome } from "@/mocks/seed/pessoas";
import type { CasoRegistro } from "@/mocks/db/tipos";
import { documentosDoCaso } from "@/mocks/db/repositorio";

export function valoresDoCaso(caso: CasoRegistro): Record<string, string | null> {
   const faltam = documentosDoCaso(caso)
      .filter(d => d.obrigatorio && (d.status === "PENDENTE" || d.status === "RECUSADO"))
      .map(d => d.nome.toLowerCase());
   const resumo = caso.resumoCongelado;
   const horasAnalise = Math.round(SLA_POR_ETAPA.EM_ANALISE.minutos / 60);
   return {
      nome: primeiroNome(caso.candidato.nome),
      tipo: ROTULO_TIPO_CANDIDATO[caso.tipo],
      curso: caso.destino.cursoNome,
      documentos: faltam.length ? faltam.map(d => `• ${d}`).join("\n") : null,
      prazo: `${horasAnalise} horas úteis`,
      disciplinas: resumo ? int(resumo.contagem.dispensa) : null,
      horas: resumo ? int(resumo.chDispensada) : null,
      semestres: resumo?.previsaoSemestres ? int(resumo.previsaoSemestres) : null,
      ra: caso.candidato.ra,
   };
}

/** Variáveis do lembrete de documentos ficam numa linha só (`{{2}}` no meio da frase). */
export function valoresEmLinha(caso: CasoRegistro): Record<string, string | null> {
   const v = valoresDoCaso(caso);
   return { ...v, documentos: v.documentos ? lista(v.documentos.replace(/• /g, "").split("\n")) : null };
}
