/**
 * Acompanhamento do aluno: traduz as etapas internas do caso nos poucos passos que fazem sentido para
 * quem está do outro lado (pedido, documentos, análise, proposta e matrícula). Código PURO: usado pelo
 * backend simulado para montar a resposta pública e testado sem React.
 *
 * O que fica de fora de propósito: coordenação, ajuste, pré-análise e quem está com o caso. Para o
 * aluno, tudo isso é "estamos analisando".
 */
import { precisaDocumentosExternos, terminaNaAnalise, type Etapa, type Tipo } from "@/features/casos";

import type {
   AcompanhamentoPublico,
   EstadoPasso,
   PassoPublico,
   SituacaoPublica,
} from "@/features/acompanhamento/types/acompanhamento.schema";

/** Contato e app oficiais exibidos ao aluno (docs/15-parametros.md). */
export const CONTATO_ALUNO = {
   whatsapp: "5511948477000",
   whatsappRotulo: "(11) 94847-7000",
   appGrupoAnchieta: "https://apps.apple.com/br/app/grupo-anchieta/id1589456985",
} as const;

/** Atualização automática da página do aluno. */
export const ATUALIZAR_ACOMPANHAMENTO_MS = 30_000;

export interface EntradaAcompanhamento {
   protocolo: string;
   nome: string;
   tipo: Tipo;
   etapa: Etapa;
   etapaAnterior: Etapa | null;
   estudouForaNoPeriodo: boolean | null;
   criadoEm: string;
   atualizadoEm: string;
   jornada: readonly { etapa: Etapa; entrouEm: string }[];
   destino: AcompanhamentoPublico["curso"];
   ra: string | null;
}

const ENCERRADAS: readonly Etapa[] = ["PERDIDO", "CANCELADO"];
const AGUARDANDO_ALUNO: readonly Etapa[] = ["AGUARDANDO_DOCUMENTOS", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO"];

/** Passos do caso, na ordem em que o aluno vive. */
export function passosDoTipo(tipo: Tipo, estudouForaNoPeriodo: boolean | null): PassoPublico[] {
   const docs = precisaDocumentosExternos({ tipo, estudouForaNoPeriodo });
   const fim: PassoPublico[] = terminaNaAnalise(tipo) ? ["RESULTADO"] : ["PROPOSTA", "MATRICULA"];
   return ["RECEBIDA", ...(docs ? (["DOCUMENTOS"] as const) : []), "ANALISE", ...fim];
}

/** Passo público de uma etapa interna. Etapas sem passo próprio (adiado, encerrado) devolvem `null`. */
export function passoDaEtapa(etapa: Etapa, passos: readonly PassoPublico[]): PassoPublico | null {
   switch (etapa) {
      case "RASCUNHO":
      case "AGUARDANDO_DOCUMENTOS":
         return passos.includes("DOCUMENTOS") ? "DOCUMENTOS" : "ANALISE";
      case "PRE_ANALISE":
      case "EM_ANALISE":
      case "AGUARDANDO_COORDENACAO":
      case "AJUSTE_POS_COORDENACAO":
         return "ANALISE";
      case "PRONTO_PARA_MATRICULA":
      case "PROPOSTA_ENVIADA":
      case "EM_NEGOCIACAO":
         return "PROPOSTA";
      case "MATRICULADO":
         return "MATRICULA";
      case "CONCLUIDO":
         return "RESULTADO";
      case "ADIADO":
      case "PERDIDO":
      case "CANCELADO":
         return null;
   }
}

function situacaoDa(etapa: Etapa): SituacaoPublica {
   if (etapa === "MATRICULADO") return "MATRICULADO";
   if (etapa === "CONCLUIDO") return "CONCLUIDO";
   if (etapa === "ADIADO") return "PAUSADO";
   if (ENCERRADAS.includes(etapa)) return "ENCERRADO";
   return "EM_ANDAMENTO";
}

/** Última etapa "de trabalho" antes de pausar ou encerrar: é onde o aluno parou. */
function etapaDeReferencia(e: EntradaAcompanhamento): Etapa {
   if (passoDaEtapa(e.etapa, passosDoTipo(e.tipo, e.estudouForaNoPeriodo)) !== null) return e.etapa;
   const candidatas = [e.etapaAnterior, ...[...e.jornada].reverse().map(p => p.etapa)];
   return candidatas.find((x): x is Etapa => x !== null && x !== "ADIADO" && !ENCERRADAS.includes(x)) ?? "RASCUNHO";
}

export function montarAcompanhamento(e: EntradaAcompanhamento): AcompanhamentoPublico {
   const passos = passosDoTipo(e.tipo, e.estudouForaNoPeriodo);
   const situacao = situacaoDa(e.etapa);
   const final = situacao === "MATRICULADO" || situacao === "CONCLUIDO";
   const atual = passoDaEtapa(etapaDeReferencia(e), passos) ?? "RECEBIDA";
   const iAtual = final ? passos.length : passos.indexOf(atual);

   // Quando o caso chegou a cada passo e quando saiu dele (a última vez: uma reanálise recomeça o passo).
   const chegou = new Map<PassoPublico, string>([["RECEBIDA", e.criadoEm]]);
   const saiu = new Map<PassoPublico, string>([["RECEBIDA", e.criadoEm]]);
   let anterior: PassoPublico = "RECEBIDA";
   for (const p of e.jornada) {
      const passo = passoDaEtapa(p.etapa, passos);
      if (!passo || passo === anterior) continue;
      saiu.set(anterior, p.entrouEm);
      chegou.set(passo, p.entrouEm);
      anterior = passo;
   }
   if (final) saiu.set(passos[passos.length - 1], chegou.get(passos[passos.length - 1]) ?? e.atualizadoEm);

   return {
      protocolo: e.protocolo,
      primeiroNome: e.nome.trim().split(/\s+/)[0] ?? "",
      tipo: e.tipo,
      curso: e.destino,
      situacao,
      aguardandoAluno: situacao === "EM_ANDAMENTO" && AGUARDANDO_ALUNO.includes(e.etapa),
      passos: passos.map((passo, i) => {
         const estado: EstadoPasso = i < iAtual ? "FEITO" : i > iAtual ? "PROXIMO" : situacao === "ENCERRADO" ? "INTERROMPIDO" : "ATUAL";
         const em = estado === "FEITO" ? (saiu.get(passo) ?? null) : estado === "PROXIMO" ? null : (chegou.get(passo) ?? null);
         return { passo, estado, em };
      }),
      ra: situacao === "MATRICULADO" ? e.ra : null,
      atualizadoEm: e.atualizadoEm,
   };
}

/** Link do WhatsApp com a mensagem já começada (o protocolo ajuda a equipe a achar o caso). */
export function linkWhatsapp(protocolo?: string): string {
   const texto = protocolo
      ? `Olá! Estou acompanhando minha solicitação na UniAnchieta (protocolo ${protocolo}) e tenho uma dúvida.`
      : "Olá! Tenho uma dúvida sobre minha solicitação na UniAnchieta.";
   return `https://wa.me/${CONTATO_ALUNO.whatsapp}?text=${encodeURIComponent(texto)}`;
}

/** Endereço público do acompanhamento. `origem` + `base` vêm do navegador e do `env.baseUrl`. */
export function urlAcompanhamento(token: string, origem: string, base: string): string {
   return `${origem.replace(/\/+$/, "")}/${base.replace(/^\/+|\/+$/g, "")}/acompanhe/${encodeURIComponent(token)}`.replace(
      /([^:])\/{2,}/g,
      "$1/",
   );
}
