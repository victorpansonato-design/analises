/**
 * Handlers simulados: checklist, arquivos e histórico interno (contrato: tag Documentos). Aplicam as
 * mesmas regras da interface (`motivoNaoAvaliar`, `motivoNaoAnexar`, `motivoRecusaInvalido`) e as
 * permissões do caso; aceitar o último obrigatório move o caso sozinho para a pré-análise.
 */
import { http } from "msw";

import {
   ID_HISTORICO_INTERNO,
   MotivoRecusaSchema,
   ROTULO_MOTIVO_RECUSA,
   TEMPLATE_RECUSA,
   motivoNaoAnexar,
   motivoNaoAvaliar,
   motivoRecusaInvalido,
   textoRecusa,
   type AvaliacaoDocumento,
   type ItemChecklist,
} from "@/features/documentos";
import type { NomeAcao } from "@/features/casos";

import { verificarDocumentosCompletos } from "@/mocks/db/casos";
import { valoresDoCaso } from "@/mocks/db/comunicacao";
import { novoId } from "@/mocks/db/estado";
import { documentosDoCaso, registrarEvento } from "@/mocks/db/repositorio";
import type { CasoRegistro } from "@/mocks/db/tipos";
import { API, erro, ok } from "@/mocks/lib/http";
import { hash } from "@/mocks/lib/prng";
import { primeiroNome } from "@/mocks/seed/pessoas";
import { casoOu404, conflitoDeVersao, preparar, proibidoSeNaoPuder, tocar, type Contexto } from "@/mocks/handlers/comum";

const valores = (caso: CasoRegistro) => () => valoresDoCaso(caso);
const autorDe = (ctx: Contexto) => ({ tipo: "PESSOA" as const, id: ctx.usuario.id, nome: ctx.usuario.nome });

function invalido(mensagem: string) {
   return erro(422, "VALIDACAO", mensagem, { detalhes: [mensagem] });
}

/** Libera se QUALQUER das ações estiver habilitada; senão devolve o 403 da primeira. */
function proibidoSeNenhuma(caso: CasoRegistro, ctx: Contexto, nomes: NomeAcao[]): Response | null {
   const bloqueios = nomes.map(n => proibidoSeNaoPuder(caso, ctx, n));
   return bloqueios.some(b => b === null) ? null : bloqueios[0];
}

function itemOu404(caso: CasoRegistro, checklistId: unknown): ItemChecklist | Response {
   const item = documentosDoCaso(caso).find(i => i.id === checklistId);
   return item ?? erro(404, "NAO_ENCONTRADO", "Documento não encontrado no checklist deste caso.");
}

/** Legibilidade simulada (o backend real usa OCR): arquivo muito pequeno costuma ser foto ruim. */
export function legibilidadeSimulada(nome: string, tamanho: number): ItemChecklist["legibilidade"] {
   if (tamanho < 60_000) return "RUIM";
   return hash(`${nome}-${tamanho}`) % 10 < 2 ? "DUVIDOSA" : "BOA";
}

function escaparXml(s: string): string {
   return s.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] ?? c);
}

/** Imagem fictícia no lugar do arquivo: nenhum documento real existe nos dados simulados. */
export function documentoFicticioSvg(documento: string, arquivo: string): string {
   const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="595" height="842" viewBox="0 0 595 842">
<rect width="595" height="842" fill="white"/>
<rect x="40" y="40" width="515" height="762" fill="none" stroke="silver" stroke-width="2" stroke-dasharray="8 6"/>
<text x="297" y="380" text-anchor="middle" font-family="sans-serif" font-size="28" fill="dimgray">Documento acadêmico</text>
<text x="297" y="420" text-anchor="middle" font-family="sans-serif" font-size="16" fill="gray">${escaparXml(documento)}</text>
<text x="297" y="450" text-anchor="middle" font-family="monospace" font-size="14" fill="gray">${escaparXml(arquivo)}</text>
</svg>`;
   return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface ArquivoRecebido {
   name: string;
   size: number;
   type: string;
}

function ehArquivo(v: unknown): v is ArquivoRecebido {
   return typeof v === "object" && v !== null && "name" in v && "size" in v && typeof (v as ArquivoRecebido).name === "string";
}

export const handlersDocumentos = [
   http.get(`${API}/casos/:casoId/documentos`, async ({ params }) => {
      await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      return ok(documentosDoCaso(caso));
   }),

   http.post(`${API}/casos/:casoId/documentos`, async ({ params, request }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const bloqueio = conflitoDeVersao(request, caso) ?? proibidoSeNenhuma(caso, ctx, ["SOLICITAR_DOCUMENTO", "AVALIAR_DOCUMENTO"]);
      if (bloqueio) return bloqueio;
      const form = await request.formData();
      const arquivo = form.get("arquivo");
      const checklistId = form.get("checklistId");
      if (!ehArquivo(arquivo) || typeof checklistId !== "string") return invalido("Envie o arquivo e indique o documento do checklist");
      const item = itemOu404(caso, checklistId);
      if (item instanceof Response) return item;
      const motivo = motivoNaoAnexar(item);
      if (motivo) return invalido(motivo);

      item.status = "RECEBIDO";
      item.motivoRecusa = null;
      item.legibilidade = legibilidadeSimulada(arquivo.name, arquivo.size);
      item.arquivos.push({
         id: novoId("arq"),
         nome: arquivo.name,
         mime: arquivo.type || "application/octet-stream",
         tamanho: arquivo.size,
         canal: "CONSULTOR",
         recebidoEm: ctx.agora.toISOString(),
      });
      tocar(caso, ctx.usuario, ctx.agora);
      registrarEvento(
         caso,
         {
            tipo: "documento.recebido",
            categoria: "SISTEMA",
            em: ctx.agora.toISOString(),
            autor: autorDe(ctx),
            titulo: "Documento anexado pela equipe",
            detalhe: `${item.nome} · ${arquivo.name}`,
            visivelAoCandidato: false,
            statusEntrega: null,
            dados: { checklistId: item.id },
         },
         valores(caso),
      );
      return ok(item, 201);
   }),

   http.patch(`${API}/casos/:casoId/documentos/:checklistId`, async ({ params, request }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const bloqueio = conflitoDeVersao(request, caso) ?? proibidoSeNaoPuder(caso, ctx, "AVALIAR_DOCUMENTO");
      if (bloqueio) return bloqueio;
      const item = itemOu404(caso, params.checklistId);
      if (item instanceof Response) return item;
      const corpo = (await request.json()) as Partial<AvaliacaoDocumento>;
      const status = corpo.status;
      if (status !== "ACEITO" && status !== "RECUSADO" && status !== "DISPENSADO")
         return invalido("Informe se o documento foi aceito, recusado ou dispensado");
      const motivo = motivoNaoAvaliar(item, status);
      if (motivo) return invalido(motivo);

      const quando = ctx.agora.toISOString();
      const autor = autorDe(ctx);
      const decisao = (tipo: string, titulo: string, detalhe: string | null) =>
         registrarEvento(
            caso,
            {
               tipo,
               categoria: "DECISAO",
               em: quando,
               autor,
               titulo,
               detalhe,
               visivelAoCandidato: false,
               statusEntrega: null,
               dados: { checklistId: item.id },
            },
            valores(caso),
         );

      if (status === "RECUSADO") {
         const m = MotivoRecusaSchema.safeParse(corpo.motivoRecusa);
         const invalida = motivoRecusaInvalido(m.success ? m.data : null, corpo.texto);
         if (invalida || !m.success) return invalido(invalida ?? "Escolha o motivo da recusa");
         const texto = corpo.texto?.trim() || null;
         item.status = "RECUSADO";
         item.motivoRecusa = m.data;
         decisao(
            "documento.recusado",
            `Documento recusado: ${item.nome.toLowerCase()}`,
            texto ? `${ROTULO_MOTIVO_RECUSA[m.data]}: ${texto}` : ROTULO_MOTIVO_RECUSA[m.data],
         );
         // A recusa dispara a mensagem ao candidato na hora (docs/08 §2), se houver autorização.
         if (caso.candidato.optInWhatsapp) {
            const arquivo = item.arquivos[item.arquivos.length - 1]?.nome ?? item.nome;
            registrarEvento(
               caso,
               {
                  tipo: "mensagem.enviada",
                  categoria: "MENSAGEM",
                  em: quando,
                  autor: { tipo: "SISTEMA", id: null, nome: null },
                  titulo: "Mensagem enviada: documento recusado",
                  detalhe: textoRecusa({ nome: primeiroNome(caso.candidato.nome), arquivo, documento: item.nome, motivo: m.data, texto }),
                  visivelAoCandidato: true,
                  statusEntrega: "ENTREGUE",
                  dados: { templateId: TEMPLATE_RECUSA, checklistId: item.id, botoes: [] },
               },
               valores(caso),
            );
         } else {
            registrarEvento(
               caso,
               {
                  tipo: "mensagem.nao_enviada",
                  categoria: "SISTEMA",
                  em: quando,
                  autor: { tipo: "SISTEMA", id: null, nome: null },
                  titulo: "Mensagem de recusa não enviada",
                  detalhe: "O candidato não autorizou contato pelo WhatsApp. Combine o reenvio por outro canal.",
                  visivelAoCandidato: false,
                  statusEntrega: null,
               },
               valores(caso),
            );
         }
      } else if (status === "ACEITO") {
         item.status = "ACEITO";
         item.motivoRecusa = null;
         decisao("documento.aceito", `Documento aceito: ${item.nome.toLowerCase()}`, null);
      } else {
         item.status = "DISPENSADO";
         item.motivoRecusa = null;
         decisao("documento.dispensado", `Documento dispensado: ${item.nome.toLowerCase()}`, "Opcional, dispensado pela equipe.");
      }

      tocar(caso, ctx.usuario, ctx.agora);
      if (status !== "RECUSADO") verificarDocumentosCompletos(caso, ctx.agora);
      return ok(item);
   }),

   http.get(`${API}/casos/:casoId/documentos/:checklistId/arquivo/:arquivoId`, async ({ params }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const item = itemOu404(caso, params.checklistId);
      if (item instanceof Response) return item;
      const arquivo = item.arquivos.find(a => a.id === params.arquivoId);
      if (!arquivo) return erro(404, "NAO_ENCONTRADO", "Arquivo não encontrado. Ele pode ter sido substituído por um envio mais novo.");
      if (item.sensivel) {
         const b = proibidoSeNaoPuder(caso, ctx, "VER_DOCUMENTO_IDENTIDADE");
         if (b) return b;
      }
      // LGPD: toda abertura de arquivo gera log de acesso (docs/11 §2).
      registrarEvento(
         caso,
         {
            tipo: "documento.visualizado",
            categoria: "SISTEMA",
            em: ctx.agora.toISOString(),
            autor: autorDe(ctx),
            titulo: "Documento aberto",
            detalhe: `${item.nome} · ${arquivo.nome}. Acesso registrado para auditoria.`,
            visivelAoCandidato: false,
            statusEntrega: null,
            dados: { checklistId: item.id, arquivoId: arquivo.id },
         },
         valores(caso),
      );
      return ok({
         url: documentoFicticioSvg(item.nome, arquivo.nome),
         expiraEm: new Date(ctx.agora.getTime() + 5 * 60_000).toISOString(),
         mime: "image/svg+xml",
      });
   }),

   http.post(`${API}/casos/:casoId/historico-interno\\:migrar`, async ({ params, request }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const bloqueio = conflitoDeVersao(request, caso) ?? proibidoSeNenhuma(caso, ctx, ["SOLICITAR_DOCUMENTO", "AVALIAR_DOCUMENTO"]);
      if (bloqueio) return bloqueio;
      if (caso.tipo !== "TRANSFERENCIA_INTERNA" && caso.tipo !== "RETORNO")
         return invalido("Só transferência interna e retorno usam o histórico interno");
      const item = documentosDoCaso(caso).find(i => i.id === ID_HISTORICO_INTERNO);
      if (!item) return invalido("Este caso não tem histórico interno no checklist");

      item.status = "ACEITO";
      item.motivoRecusa = null;
      item.legibilidade = "BOA";
      item.arquivos = [
         {
            id: novoId("arq"),
            nome: "historico-interno.pdf",
            mime: "application/pdf",
            tamanho: 240_000,
            canal: "INTERNO",
            recebidoEm: ctx.agora.toISOString(),
         },
      ];
      tocar(caso, ctx.usuario, ctx.agora);
      registrarEvento(
         caso,
         {
            tipo: "historico.migrado",
            categoria: "SISTEMA",
            em: ctx.agora.toISOString(),
            autor: autorDe(ctx),
            titulo: "Histórico interno migrado",
            detalhe: "Do sistema acadêmico, com as disciplinas cursadas na UniAnchieta.",
            visivelAoCandidato: false,
            statusEntrega: null,
         },
         valores(caso),
      );
      verificarDocumentosCompletos(caso, ctx.agora);
      return ok(null, 202);
   }),
];
