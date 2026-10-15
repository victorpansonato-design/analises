/**
 * "Próximo passo" (docs/05 §3.3): o elemento mais importante da tela. Uma frase sempre no formato
 * [o que falta] · [com quem] · [prazo] e NO MÁXIMO uma ação primária, a do papel logado, se houver.
 *
 * Puro: recebe o caso (com `acoesDisponiveis` já calculadas pela API), quem está olhando e o relógio.
 * A ação só aparece se a API a devolveu para este usuário; desabilitada, vem com o motivo.
 */
import { stamp } from "@/lib/format";

import { acaoDoCaso, type NomeAcao } from "@/features/casos/domain/acoes";
import { proximoLembreteDocumentos, proximoLembreteProposta } from "@/features/casos/domain/regua";
import { lerSla, rotuloSla, type EstadoSla } from "@/features/casos/domain/sla";
import { ROTULO_PENDENCIA, type CasoDetalhe } from "@/features/casos/types/caso.schema";

/** Para onde a ação leva quando não é uma chamada direta (abre uma aba já no ponto certo). */
export type Destino = { aba: "analise"; filtro: "coordenacao" | "pendentes" } | { aba: "proposta"; acao: NomeAcao };

export interface AcaoPasso {
   acao: NomeAcao;
   rotulo: string;
   habilitada: boolean;
   motivos: string[];
   /** Quando existe, a ação abre esta aba em vez de executar direto. */
   ir?: Destino;
}

export interface ProximoPasso {
   oQue: string;
   comQuem: string;
   prazo: { texto: string; estado: EstadoSla } | null;
   primaria: AcaoPasso | null;
   secundaria: AcaoPasso | null;
}

export interface Observador {
   id: string;
}

function plural(n: number, um: string, varios: string): string {
   return n === 1 ? um : varios;
}

function passo(caso: CasoDetalhe, nome: NomeAcao, rotulo: string, ir?: Destino): AcaoPasso | null {
   const a = acaoDoCaso(caso, nome);
   if (!a) return null;
   return { acao: nome, rotulo, habilitada: a.habilitada, motivos: a.motivos, ir };
}

function prazoDoCaso(caso: CasoDetalhe, agora: Date): ProximoPasso["prazo"] {
   const leitura = lerSla(caso.sla, agora);
   if (leitura.estado === "SEM_SLA") return null;
   return { texto: rotuloSla(leitura, caso.sla.pausadoAte), estado: leitura.estado };
}

function nomeOuVoce(usuario: { id: string; nome: string } | null, eu: Observador): string {
   if (!usuario) return "Sem responsável";
   return usuario.id === eu.id ? "você" : usuario.nome;
}

export function calcularProximoPasso(caso: CasoDetalhe, eu: Observador, agora: Date): ProximoPasso {
   const prazo = prazoDoCaso(caso, agora);
   const responsavel = nomeOuVoce(caso.responsavel, eu);
   const souResponsavel = caso.responsavel?.id === eu.id;
   const c = caso.contadores;
   const base = { oQue: "", comQuem: responsavel, prazo, primaria: null, secundaria: null } satisfies ProximoPasso;

   switch (caso.etapa) {
      case "RASCUNHO":
         return { ...base, oQue: "Concluir o protocolo", primaria: passo(caso, "ENVIAR_PROTOCOLO", "Enviar protocolo") };

      case "AGUARDANDO_DOCUMENTOS": {
         const faltam = Math.max(0, c.documentosObrigatorios - c.documentosAceitos);
         const lembrete = proximoLembreteDocumentos(caso.etapaDesde, agora);
         const oQue =
            faltam === 0
               ? "Documentos recebidos, aguardando conferência"
               : `${plural(faltam, "Falta 1 documento obrigatório", `Faltam ${faltam} documentos obrigatórios`)}`;
         return {
            ...base,
            oQue,
            comQuem: "candidato",
            prazo: lembrete ? { texto: `lembrete automático ${stamp(lembrete, agora).toLowerCase()}`, estado: "NO_PRAZO" } : prazo,
            secundaria: passo(caso, "SOLICITAR_DOCUMENTO", "Lembrar agora pelo WhatsApp"),
         };
      }

      case "PRE_ANALISE":
         return {
            ...base,
            oQue: "Pré-análise lendo o histórico",
            comQuem: "sistema",
            prazo: { texto: "cerca de 1 min", estado: "NO_PRAZO" },
         };

      case "EM_ANALISE":
      case "AJUSTE_POS_COORDENACAO": {
         if (!caso.responsavel) {
            return {
               ...base,
               oQue: caso.etapa === "AJUSTE_POS_COORDENACAO" ? "Ajuste após a coordenação sem responsável" : "Análise sem responsável",
               primaria: passo(caso, "ASSUMIR", "Assumir caso"),
            };
         }
         if (!souResponsavel && !acaoDoCaso(caso, "CONCLUIR_ANALISE")) {
            return { ...base, oQue: caso.etapa === "AJUSTE_POS_COORDENACAO" ? "Ajuste após a coordenação" : "Análise em andamento" };
         }
         const pendentes = c.itensSemDecisao;
         let oQue: string;
         if (c.perguntasAbertas > 0)
            oQue = `${plural(c.perguntasAbertas, "1 pergunta pronta", `${c.perguntasAbertas} perguntas prontas`)} para a coordenação`;
         else if (pendentes > 0) oQue = `Revisar ${plural(pendentes, "1 disciplina pendente", `${pendentes} disciplinas pendentes`)}`;
         else oQue = "Tudo decidido, falta concluir a análise";
         const enviar = c.perguntasAbertas > 0 ? passo(caso, "ENVIAR_COORDENACAO", "Enviar para coordenação") : null;
         const concluir = passo(caso, "CONCLUIR_ANALISE", "Concluir análise");
         return enviar?.habilitada ? { ...base, oQue, primaria: enviar, secundaria: null } : { ...base, oQue, primaria: concluir };
      }

      case "AGUARDANDO_COORDENACAO": {
         const n = c.perguntasAbertas;
         const responder = acaoDoCaso(caso, "RESPONDER_ITEM_COORDENACAO");
         if (responder) {
            if (n > 0) {
               return {
                  ...base,
                  oQue: `Responder ${plural(n, "1 pergunta", `${n} perguntas`)}`,
                  primaria: {
                     acao: "RESPONDER_ITEM_COORDENACAO",
                     rotulo: "Responder coordenação",
                     habilitada: responder.habilitada,
                     motivos: responder.motivos,
                     ir: { aba: "analise", filtro: "coordenacao" },
                  },
               };
            }
            return {
               ...base,
               oQue: "Perguntas respondidas, falta devolver",
               primaria: passo(caso, "RESPONDER_COORDENACAO", "Devolver para a analista"),
            };
         }
         return { ...base, oQue: n > 0 ? `Coordenação responde ${plural(n, "1 pergunta", `${n} perguntas`)}` : "Coordenação revisando" };
      }

      case "PRONTO_PARA_MATRICULA":
         return souResponsavel || acaoDoCaso(caso, "ENVIAR_PROPOSTA")
            ? {
                 ...base,
                 oQue: "Primeiro contato com o candidato",
                 primaria: !caso.responsavel
                    ? passo(caso, "ASSUMIR", "Assumir caso")
                    : passo(caso, "ENVIAR_PROPOSTA", "Enviar proposta", { aba: "proposta", acao: "ENVIAR_PROPOSTA" }),
              }
            : { ...base, oQue: "Aguardando primeiro contato da matrícula" };

      case "PROPOSTA_ENVIADA": {
         const lembrete = proximoLembreteProposta(caso.etapaDesde, agora);
         return {
            ...base,
            oQue: "Aguardando resposta do candidato",
            comQuem: "candidato",
            prazo: lembrete ? { texto: `lembrete automático ${stamp(lembrete, agora).toLowerCase()}`, estado: "NO_PRAZO" } : prazo,
            secundaria: passo(caso, "REGISTRAR_RESPOSTA", "Registrar resposta", { aba: "proposta", acao: "REGISTRAR_RESPOSTA" }),
         };
      }

      case "EM_NEGOCIACAO":
         return {
            ...base,
            oQue: "Candidato respondeu",
            primaria: passo(caso, "EFETIVAR_MATRICULA", "Efetivar matrícula", { aba: "proposta", acao: "EFETIVAR_MATRICULA" }),
         };

      case "ADIADO":
         return {
            ...base,
            oQue: caso.sla.pausadoAte ? `Adiado, retoma sozinho em ${stamp(caso.sla.pausadoAte, agora).toLowerCase()}` : "Adiado",
            comQuem: "sistema",
            prazo: null,
            secundaria: passo(caso, "RETOMAR", "Retomar agora"),
         };

      case "MATRICULADO":
         return { ...base, oQue: "Matrícula efetivada", comQuem: "concluído", prazo: null };

      case "CONCLUIDO":
         return { ...base, oQue: "Aproveitamento concluído: lançar as dispensas no histórico do aluno", comQuem: "concluído", prazo: null };

      case "PERDIDO":
      case "CANCELADO":
         return {
            ...base,
            oQue: caso.etapa === "PERDIDO" ? "Caso encerrado como perdido" : "Caso cancelado",
            comQuem: "encerrado",
            prazo: null,
            secundaria: passo(caso, "REABRIR", "Reabrir"),
         };
   }
}

/** Linha da pendência externa que pausa o relógio (docs/03 §5). */
export function rotuloPendencia(caso: Pick<CasoDetalhe, "pendencia">, agora: Date): string | null {
   if (!caso.pendencia) return null;
   return `${ROTULO_PENDENCIA[caso.pendencia.tipo]} · revisar ${stamp(caso.pendencia.revisarEm, agora).toLowerCase()}`;
}
