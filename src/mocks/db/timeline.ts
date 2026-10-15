/**
 * Histórico simulado de um caso, derivado da jornada: abertura, mensagens da régua, documentos
 * recebidos, pré-análise, decisões, coordenação, proposta e desfecho. Uma nota interna aqui e ali
 * mostra o uso de @menção. Tudo fictício.
 */
import type { EventoTimeline } from "@/features/timeline";

import { criarPrng } from "@/mocks/lib/prng";
import type { CasoRegistro } from "@/mocks/db/tipos";
import { preencher, templatePorId } from "@/mocks/seed/templates";
import { resumoUsuario, usuarioPorId } from "@/mocks/seed/usuarios";

type Novo = Omit<EventoTimeline, "id">;

const pessoa = (id: string | null) => {
   const u = usuarioPorId(id);
   return u ? { tipo: "PESSOA" as const, id: u.id, nome: u.nome } : { tipo: "SISTEMA" as const, id: null, nome: null };
};
const SISTEMA = { tipo: "SISTEMA" as const, id: null, nome: null };
const IA_AUTOR = { tipo: "IA" as const, id: null, nome: "Pré-análise" };

function mensagem(templateId: string, em: string, valores: Record<string, string | null>, autorId: string | null = null): Novo {
   const t = templatePorId(templateId);
   const texto = t ? preencher(t, valores).texto : "";
   return {
      tipo: "mensagem.enviada",
      categoria: "MENSAGEM",
      em,
      autor: autorId ? pessoa(autorId) : SISTEMA,
      titulo: t ? `Mensagem enviada: ${t.nome.toLowerCase()}` : "Mensagem enviada",
      detalhe: texto,
      visivelAoCandidato: true,
      statusEntrega: "LIDA",
      dados: { templateId },
   };
}

function mais(iso: string, minutos: number): string {
   return new Date(new Date(iso).getTime() + minutos * 60_000).toISOString();
}

export function gerarEventosBase(caso: CasoRegistro, valores: Record<string, string | null>): Novo[] {
   const r = criarPrng(`timeline-${caso.semente}`);
   const ev: Novo[] = [];
   const nome = caso.candidato.nome.split(" ")[0];
   const analista = resumoUsuario(caso.responsaveis.analistaId);
   const matricula = resumoUsuario(caso.responsaveis.matriculaId);

   ev.push({
      tipo: "caso.criado",
      categoria: "SISTEMA",
      em: caso.criadoEm,
      autor: pessoa(caso.responsaveis.consultorId),
      titulo: "Protocolo aberto",
      detalhe: `${caso.protocolo} · ${caso.destino.cursoNome}`,
      visivelAoCandidato: false,
      statusEntrega: null,
   });

   for (const passo of caso.jornada) {
      const em = passo.entrouEm;
      switch (passo.etapa) {
         case "AGUARDANDO_DOCUMENTOS":
            ev.push(
               mensagem("protocolo_aberto", mais(em, 1), {
                  ...valores,
                  documentos: valores.documentos ?? "• histórico escolar\n• planos de ensino",
               }),
            );
            ev.push({
               tipo: "documento.recebido",
               categoria: "MENSAGEM",
               em: mais(em, r.int(60, 900)),
               autor: { tipo: "CANDIDATO", id: null, nome },
               titulo: "Candidato enviou um documento pelo WhatsApp",
               detalhe: "historico.pdf",
               visivelAoCandidato: true,
               statusEntrega: null,
            });
            break;
         case "PRE_ANALISE":
            ev.push({
               tipo: "documentos.completos",
               categoria: "SISTEMA",
               em,
               autor: SISTEMA,
               titulo: "Documentos completos",
               detalhe: "Pré-análise iniciada automaticamente.",
               visivelAoCandidato: false,
               statusEntrega: null,
            });
            break;
         case "EM_ANALISE":
            ev.push({
               tipo: caso.flags.preAnaliseFalhou ? "pre_analise.falhou" : "pre_analise.concluida",
               categoria: "SISTEMA",
               em,
               autor: IA_AUTOR,
               titulo: caso.flags.preAnaliseFalhou ? "Pré-análise não concluiu" : "Pré-análise concluída",
               detalhe: caso.flags.preAnaliseFalhou
                  ? "O serviço não respondeu a tempo. A grade segue sem sugestões; dá para reexecutar."
                  : "Sugestões prontas para revisão.",
               visivelAoCandidato: false,
               statusEntrega: null,
            });
            if (analista) {
               ev.push({
                  tipo: "caso.atribuido",
                  categoria: "SISTEMA",
                  em: mais(em, 1),
                  autor: SISTEMA,
                  titulo: `Distribuído para ${analista.nome}`,
                  detalhe: "Menor carga entre os analistas do curso.",
                  visivelAoCandidato: false,
                  statusEntrega: null,
               });
            }
            break;
         case "AGUARDANDO_COORDENACAO":
            ev.push({
               tipo: "coordenacao.enviada",
               categoria: "DECISAO",
               em,
               autor: pessoa(caso.responsaveis.analistaId),
               titulo: "Perguntas enviadas à coordenação",
               detalhe: null,
               visivelAoCandidato: false,
               statusEntrega: null,
            });
            break;
         case "AJUSTE_POS_COORDENACAO":
            ev.push({
               tipo: "coordenacao.concluida",
               categoria: "DECISAO",
               em,
               autor: pessoa(caso.responsaveis.coordenadorId),
               titulo: "Coordenação respondeu as perguntas",
               detalhe: "Respostas registradas como regra para os próximos casos.",
               visivelAoCandidato: false,
               statusEntrega: null,
            });
            break;
         case "PRONTO_PARA_MATRICULA":
            ev.push({
               tipo: "analise.concluida",
               categoria: "DECISAO",
               em,
               autor: pessoa(caso.responsaveis.analistaId),
               titulo: "Análise concluída",
               detalhe: "Resumo congelado para a proposta.",
               visivelAoCandidato: false,
               statusEntrega: null,
            });
            if (matricula)
               ev.push({
                  tipo: "caso.atribuido",
                  categoria: "SISTEMA",
                  em: mais(em, 1),
                  autor: SISTEMA,
                  titulo: `Distribuído para ${matricula.nome}`,
                  detalhe: "Primeiro contato pela matrícula.",
                  visivelAoCandidato: false,
                  statusEntrega: null,
               });
            break;
         case "PROPOSTA_ENVIADA":
            ev.push({
               ...mensagem("proposta_pronta", em, valores, caso.responsaveis.matriculaId),
               tipo: "proposta.enviada",
               titulo: "Proposta enviada pelo WhatsApp",
            });
            break;
         case "EM_NEGOCIACAO":
            ev.push({
               tipo: "mensagem.recebida",
               categoria: "MENSAGEM",
               em,
               autor: { tipo: "CANDIDATO", id: null, nome },
               titulo: "Candidato respondeu",
               detalhe: "Quero saber",
               visivelAoCandidato: true,
               statusEntrega: null,
            });
            break;
         case "MATRICULADO":
            ev.push({
               tipo: "matricula.efetivada",
               categoria: "DECISAO",
               em,
               autor: pessoa(caso.responsaveis.matriculaId),
               titulo: "Matrícula efetivada",
               detalhe: caso.proposta.aceite ? `Aceite por ${caso.proposta.aceite.canal.toLowerCase()}` : null,
               visivelAoCandidato: false,
               statusEntrega: null,
            });
            ev.push(mensagem("matricula_confirmada", mais(em, 2), valores));
            break;
         case "PERDIDO":
            ev.push({
               tipo: "caso.perdido",
               categoria: "DECISAO",
               em,
               autor: pessoa(caso.responsaveis.matriculaId ?? caso.responsaveis.consultorId),
               titulo: "Encerrado como perdido",
               detalhe: caso.motivoEncerramento,
               visivelAoCandidato: false,
               statusEntrega: null,
            });
            break;
         case "CANCELADO":
            ev.push({
               tipo: "caso.cancelado",
               categoria: "DECISAO",
               em,
               autor: pessoa(caso.responsaveis.consultorId),
               titulo: "Caso cancelado",
               detalhe: caso.motivoEncerramento,
               visivelAoCandidato: false,
               statusEntrega: null,
            });
            break;
         case "ADIADO":
            ev.push({
               tipo: "caso.adiado",
               categoria: "DECISAO",
               em,
               autor: pessoa(caso.responsaveis.matriculaId),
               titulo: "Caso adiado",
               detalhe: "Retoma automaticamente na data marcada.",
               visivelAoCandidato: false,
               statusEntrega: null,
            });
            break;
         default:
            break;
      }
   }

   if (r.chance(0.45) && caso.jornada.length > 1) {
      const autorId = r.pick([caso.responsaveis.consultorId, caso.responsaveis.analistaId].filter(Boolean) as string[]);
      const outro = resumoUsuario(autorId === caso.responsaveis.consultorId ? caso.responsaveis.analistaId : caso.responsaveis.consultorId);
      const texto = r.pick([
         "Candidato ligou perguntando o prazo. Expliquei que o retorno sai pelo WhatsApp.",
         "Candidato prefere contato depois das 18h.",
         "Candidato comentou que está comparando com outra instituição.",
      ]);
      ev.push({
         tipo: "nota.adicionada",
         categoria: "NOTA",
         em: mais(caso.jornada[1].entrouEm, r.int(10, 300)),
         autor: pessoa(autorId),
         titulo: "Nota interna",
         detalhe: outro ? `@${outro.nome.split(" ")[0]} ${texto}` : texto,
         visivelAoCandidato: false,
         statusEntrega: null,
         dados: outro ? { mencoes: [outro.id] } : undefined,
      });
   }
   return ev;
}
