/**
 * Checklist de documentos simulado (docs/15 §4, [VALIDAR com Secretaria]). Itens e estados seguem o
 * tipo e a etapa do caso: em "Documentos" há pendentes, recebidos a conferir e recusados; depois,
 * tudo aceito. Arquivos têm nome genérico: nenhum documento real existe aqui.
 */
import type { CanalDocumento, ItemChecklist } from "@/features/documentos";

import { criarPrng } from "@/mocks/lib/prng";
import type { CasoRegistro } from "@/mocks/db/tipos";

interface Modelo {
   id: string;
   nome: string;
   obrigatorio: boolean;
   sensivel?: boolean;
   interno?: boolean;
   arquivo: string;
}

export function modelosDoTipo(caso: Pick<CasoRegistro, "tipo" | "subtipo" | "origem">): Modelo[] {
   const historicoInterno: Modelo = {
      id: "historico-interno",
      nome: "Histórico interno (migrado do sistema acadêmico)",
      obrigatorio: true,
      interno: true,
      arquivo: "historico-interno.pdf",
   };
   switch (caso.tipo) {
      case "TRANSFERENCIA_EXTERNA":
         return [
            { id: "historico", nome: "Histórico escolar da IES de origem", obrigatorio: true, arquivo: "historico.pdf" },
            { id: "planos", nome: "Planos de ensino das disciplinas cursadas", obrigatorio: true, arquivo: "planos-de-ensino.pdf" },
            { id: "vinculo", nome: "Declaração de vínculo", obrigatorio: true, arquivo: "declaracao-vinculo.jpg" },
            { id: "identidade", nome: "Documento de identidade", obrigatorio: false, sensivel: true, arquivo: "documento-identidade.jpg" },
         ];
      case "PORTADOR_DIPLOMA":
         return [
            { id: "diploma", nome: "Diploma de graduação (frente e verso)", obrigatorio: true, arquivo: "diploma.pdf" },
            { id: "historico", nome: "Histórico da graduação", obrigatorio: true, arquivo: "historico-graduacao.pdf" },
            { id: "planos", nome: "Planos de ensino das disciplinas cursadas", obrigatorio: true, arquivo: "planos-de-ensino.pdf" },
         ];
      case "APROVEITAMENTO_ESTUDOS":
         // [VALIDAR com Secretaria] aluno ativo pedindo dispensa por estudos feitos em outra instituição.
         return [
            historicoInterno,
            {
               id: "historico",
               nome: "Histórico da instituição em que cursou as disciplinas",
               obrigatorio: true,
               arquivo: "historico-externo.pdf",
            },
            { id: "planos", nome: "Planos de ensino das disciplinas cursadas", obrigatorio: true, arquivo: "planos-de-ensino.pdf" },
         ];
      case "TRANSFERENCIA_INTERNA":
         return [
            historicoInterno,
            { id: "requerimento", nome: "Requerimento com o motivo da troca", obrigatorio: false, arquivo: "requerimento.pdf" },
         ];
      case "RETORNO":
         return caso.origem.estudouForaNoPeriodo
            ? [
                 historicoInterno,
                 {
                    id: "historico",
                    nome: "Histórico da instituição em que estudou no período",
                    obrigatorio: true,
                    arquivo: "historico-externo.pdf",
                 },
                 {
                    id: "planos",
                    nome: "Planos de ensino das disciplinas cursadas fora",
                    obrigatorio: true,
                    arquivo: "planos-de-ensino.pdf",
                 },
              ]
            : [historicoInterno];
   }
}

export function gerarChecklist(caso: CasoRegistro, agora: Date): ItemChecklist[] {
   const r = criarPrng(`docs-${caso.semente}`);
   const emDocumentos = caso.etapa === "AGUARDANDO_DOCUMENTOS" || caso.etapa === "RASCUNHO";
   const entrou = new Date(caso.etapaDesde).getTime();
   return modelosDoTipo(caso).map((m, i) => {
      let status: ItemChecklist["status"] = "ACEITO";
      if (emDocumentos && !m.interno) {
         if (caso.roteiro === "DOCUMENTOS_1") status = m.id === "planos" ? "PENDENTE" : m.obrigatorio ? "ACEITO" : "PENDENTE";
         else
            status = r.weighted([
               ["PENDENTE", 4],
               ["RECEBIDO", 2],
               ["ACEITO", 3],
               ["RECUSADO", 1],
            ] as const);
      }
      if (!m.obrigatorio && !emDocumentos && status === "ACEITO" && r.chance(0.5)) status = "DISPENSADO";
      const temArquivo = status !== "PENDENTE" && status !== "DISPENSADO";
      const canal: CanalDocumento = m.interno
         ? "INTERNO"
         : r.weighted([
              ["WHATSAPP", 6],
              ["CONSULTOR", 2],
              ["LINK", 1],
           ] as const);
      const recebidoEm = new Date(Math.min(agora.getTime() - 3600_000, entrou + (i + 1) * r.int(2, 30) * 3600_000)).toISOString();
      return {
         id: m.id,
         nome: m.nome,
         obrigatorio: m.obrigatorio,
         status,
         motivoRecusa: status === "RECUSADO" ? r.pick(["ILEGIVEL", "INCOMPLETO", "DOCUMENTO_ERRADO"]) : null,
         legibilidade: temArquivo
            ? r.weighted([
                 ["BOA", 7],
                 ["DUVIDOSA", 2],
                 ["RUIM", status === "RECUSADO" ? 3 : 0.2],
              ] as const)
            : null,
         arquivos: temArquivo
            ? [
                 {
                    id: `${m.id}-a1`,
                    nome: m.arquivo,
                    mime: m.arquivo.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
                    tamanho: r.int(180_000, 2_400_000),
                    canal,
                    recebidoEm,
                 },
              ]
            : [],
         proximoLembreteEm: null,
         sensivel: m.sensivel ?? false,
      };
   });
}

export function contadoresDocumentos(itens: readonly ItemChecklist[]) {
   const obrigatorios = itens.filter(i => i.obrigatorio);
   return {
      documentosObrigatorios: obrigatorios.length,
      documentosAceitos: obrigatorios.filter(i => i.status === "ACEITO" || i.status === "DISPENSADO").length,
   };
}

export function checklistCompleto(itens: readonly ItemChecklist[]): boolean {
   return itens.filter(i => i.obrigatorio).every(i => i.status === "ACEITO" || i.status === "DISPENSADO");
}
