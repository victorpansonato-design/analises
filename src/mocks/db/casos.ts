/**
 * Backend simulado dos casos. Usa o MESMO domínio da interface (máquina de estados, permissões,
 * SLA, prioridade): o comportamento simulado é o comportamento esperado do backend real.
 */
import { phone, searchKey } from "@/lib/format";

import {
   CAPACIDADES,
   DISTRIBUICAO,
   ETAPAS_DO_FUNIL,
   etapasDaFila,
   ETAPAS_FINAIS,
   MATRIZ,
   PAPEL_DONO_DA_ETAPA,
   PROCESSOS,
   REGRAS_ANALISE,
   ROTULO_MOTIVO_ADIAMENTO,
   ROTULO_MOTIVO_CANCELAMENTO,
   ROTULO_MOTIVO_PERDA,
   ROTULO_MOTIVO_REANALISE,
   SLA_POR_ETAPA,
   acoesDisponiveis,
   calcularPrazo,
   compararPrioridade,
   lerSla,
   mascararCpf,
   pode,
   terminaNaAnalise,
   tiposDoProcesso,
   transicionar,
   type AcaoDisponivel,
   type AcaoTransicao,
   type Ator,
   type Capacidade,
   type CasoDetalhe,
   type CasoMaquina,
   type CasoResumo,
   type EntradaTransicao,
   type Etapa,
   type Funil,
   type Ordem,
   type RegraSla,
   type Tipo,
   type Visao,
} from "@/features/casos";
import type { TipoResposta } from "@/features/proposta";
import { PAPEIS, usePapelSimuladoStore, type Papel } from "@/features/sessao";

import { criarPrng, hash } from "@/mocks/lib/prng";
import { analiseDoCaso, documentosDoCaso, notificar, registrarEvento } from "@/mocks/db/repositorio";
import { calcularResumo, cobertura, contadoresDaAnalise, gerarAnalise, origemRepetida } from "@/mocks/db/analise";
import { checklistCompleto, contadoresDocumentos } from "@/mocks/db/documentos";
import { valoresDoCaso, valoresEmLinha } from "@/mocks/db/comunicacao";
import { db } from "@/mocks/db/estado";
import type { CasoRegistro } from "@/mocks/db/tipos";
import { CALENDARIO_MOCK } from "@/mocks/seed/calendario";
import { gerarRa, mascararCelular, mascararEmail } from "@/mocks/seed/pessoas";
import { preencher, templatePorId } from "@/mocks/seed/templates";
import { ANALISTAS, MATRICULA, PERSONA_POR_PAPEL, resumoUsuario, type UsuarioMock } from "@/mocks/seed/usuarios";

const FINAIS = ETAPAS_FINAIS as readonly Etapa[];
const SEGUNDOS_PRE_ANALISE = 20;
const SEGUNDOS_RESPOSTA_SIMULADA = 45;

// ── Sessão ─────────────────────────────────────────────────────────────────────────────────────

export function usuarioAtual(): UsuarioMock {
   const pessoa = PERSONA_POR_PAPEL[usePapelSimuladoStore.getState().papel] ?? PERSONA_POR_PAPEL.ANALISTA;
   // Acesso comum a todos os papéis; a gestão comercial é a única área restrita (só quem é GESTAO).
   const gestao = pessoa.papeis.includes("GESTAO");
   return { ...pessoa, papeis: PAPEIS.filter(p => gestao || p !== "GESTAO") };
}

// ── Leituras derivadas ─────────────────────────────────────────────────────────────────────────

export function responsavelId(c: CasoRegistro): string | null {
   switch (c.etapa) {
      case "RASCUNHO":
      case "AGUARDANDO_DOCUMENTOS":
         return c.responsaveis.consultorId;
      case "EM_ANALISE":
      case "AJUSTE_POS_COORDENACAO":
         return c.responsaveis.analistaId;
      case "AGUARDANDO_COORDENACAO":
         return c.responsaveis.coordenadorId;
      case "PRONTO_PARA_MATRICULA":
      case "PROPOSTA_ENVIADA":
      case "EM_NEGOCIACAO":
         return c.responsaveis.matriculaId;
      case "ADIADO":
         return c.responsaveis.matriculaId ?? c.responsaveis.consultorId;
      default:
         return null;
   }
}

function pausadoAte(c: CasoRegistro): string | null {
   if (c.etapa === "ADIADO") return c.retomarEm;
   return c.pendencia?.revisarEm ?? null;
}

function sla(c: CasoRegistro) {
   return { venceEm: c.sla.venceEm, alertaEm: c.sla.alertaEm, pausadoAte: pausadoAte(c) };
}

function duplicado(c: CasoRegistro): boolean {
   for (const outro of db.casos.values()) {
      if (outro.id === c.id || FINAIS.includes(outro.etapa)) continue;
      if (outro.candidato.cpf === c.candidato.cpf && outro.destino.cursoId === c.destino.cursoId) return true;
   }
   return false;
}

export function paraMaquina(c: CasoRegistro): CasoMaquina {
   const analise = analiseDoCaso(c);
   const docs = documentosDoCaso(c);
   const contadores = contadoresDaAnalise(analise);
   return {
      etapa: c.etapa,
      etapaAnterior: c.etapaAnterior,
      tipo: c.tipo,
      subtipo: c.subtipo,
      estudouForaNoPeriodo: c.origem.estudouForaNoPeriodo,
      responsavelId: responsavelId(c),
      consultorId: c.responsaveis.consultorId,
      cursoDestinoId: c.destino.cursoId,
      cpfValido: c.candidato.cpf.length === 11,
      celularValido: c.candidato.celular.replace(/\D/g, "").length >= 10,
      destinoDefinido: !!c.destino.cursoId && !!c.destino.turno && !!c.destino.modalidade,
      possuiCasoAtivoDuplicado: c.etapa === "RASCUNHO" ? duplicado(c) : false,
      checklistCompleto: checklistCompleto(docs),
      itensSemDecisao: contadores.itensSemDecisao,
      perguntasAbertas: contadores.perguntasAbertas,
      periodoIngressoDefinido: analise?.periodoIngresso !== null && analise?.periodoIngresso !== undefined,
      horasComplementaresValidas: (analise?.atividades ?? []).every(a => a.ch <= REGRAS_ANALISE.atividadeComplementarMaxHoras),
      origemRepetidaInvalida: analise ? origemRepetida(analise) !== null : false,
      resumoCongelado: !!c.resumoCongeladoEm,
      resumoDoCicloVigente: true,
      condicaoFinanceiraCarregada: !!c.proposta.financeiro,
      optInWhatsapp: c.candidato.optInWhatsapp,
      aceiteRegistrado: !!c.proposta.aceite,
      matrizDoCicloMudou: false,
   };
}

function ator(u: UsuarioMock): Ator {
   return { tipo: "PESSOA", id: u.id, papeis: u.papeis, cursosCoordenados: u.cursosCoordenados };
}

const CAPACIDADES_DO_CASO = CAPACIDADES.filter(c => !["PEGAR_PROXIMO", "VER_INDICADORES_POR_PESSOA", "EDITAR_PARAMETROS"].includes(c));
const BLOQUEADAS_NO_FIM: readonly Capacidade[] = [
   "EDITAR_DADOS",
   "SOLICITAR_DOCUMENTO",
   "AVALIAR_DOCUMENTO",
   "DECIDIR_ITEM",
   "PERGUNTAR_COORDENACAO",
   "RESPONDER_ITEM_COORDENACAO",
   "ATRIBUIR",
   "REGISTRAR_PENDENCIA",
   "ESCALAR",
   "REEXECUTAR_PRE_ANALISE",
];

/** Todas as ações do caso para o usuário: transições + capacidades + assumir (docs/04 §4). */
export function acoesPara(c: CasoRegistro, u: UsuarioMock, agora: Date): AcaoDisponivel[] {
   const maquina = paraMaquina(c);
   const transicoes = acoesDisponiveis({ caso: maquina, ator: ator(u), agora }).map(a => ({
      acao: a.acao,
      habilitada: a.habilitada,
      motivos: a.motivos,
      exigeMotivo: a.exigeMotivo,
   }));
   const escopo = {
      etapa: c.etapa,
      responsavelId: responsavelId(c),
      consultorId: c.responsaveis.consultorId,
      cursoDestinoId: c.destino.cursoId,
   };
   const caps: AcaoDisponivel[] = [];
   for (const cap of CAPACIDADES_DO_CASO) {
      if (!u.papeis.some(p => MATRIZ[cap].includes(p))) continue;
      const r = pode(u, cap, escopo);
      let motivo = r.pode ? null : (r.motivo ?? "Não permitido");
      if (!motivo && FINAIS.includes(c.etapa) && BLOQUEADAS_NO_FIM.includes(cap)) motivo = "O caso está encerrado";
      if (!motivo && cap === "REEXECUTAR_PRE_ANALISE" && !["EM_ANALISE", "AJUSTE_POS_COORDENACAO"].includes(c.etapa))
         motivo = "Disponível só durante a análise";
      if (!motivo && cap === "ATRIBUIR" && !PAPEL_DONO_DA_ETAPA[c.etapa]) motivo = "Esta etapa não tem responsável de pessoa";
      if (!motivo && cap === "DECIDIR_ITEM" && !analiseDoCaso(c)) motivo = "A análise começa depois da pré-análise";
      caps.push({ acao: cap, habilitada: !motivo, motivos: motivo ? [motivo] : [], exigeMotivo: false });
   }
   const dono = PAPEL_DONO_DA_ETAPA[c.etapa];
   if (
      (dono === "ANALISTA" || dono === "MATRICULA") &&
      (u.papeis.includes(dono) || u.papeis.includes("ADMIN")) &&
      responsavelId(c) === null
   ) {
      caps.push({ acao: "ASSUMIR", habilitada: true, motivos: [], exigeMotivo: false });
   }
   return [...transicoes, ...caps];
}

export function montarResumo(c: CasoRegistro): CasoResumo {
   return {
      id: c.id,
      protocolo: c.protocolo,
      tipo: c.tipo,
      subtipo: c.subtipo,
      etapa: c.etapa,
      etapaDesde: c.etapaDesde,
      criadoEm: c.criadoEm,
      matriculado: c.matriculado,
      liberadoMatriculaEm: c.jornada.findLast(p => p.etapa === "PRONTO_PARA_MATRICULA")?.entrouEm ?? null,
      candidato: { nome: c.candidato.nome, ra: c.candidato.ra },
      destino: c.destino,
      responsavel: resumoUsuario(responsavelId(c)),
      sla: sla(c),
      pendencia: c.pendencia,
      flags: c.flags,
      reanalises: c.reanalises,
      versao: c.versao,
   };
}

export function montarDetalhe(c: CasoRegistro, u: UsuarioMock, agora: Date): CasoDetalhe {
   const docs = contadoresDocumentos(documentosDoCaso(c));
   const analise = contadoresDaAnalise(analiseDoCaso(c));
   const veContato = u.papeis.some(p => MATRIZ.ENVIAR_MENSAGEM.includes(p));
   return {
      ...montarResumo(c),
      etapaAnterior: c.etapaAnterior,
      candidato: {
         pessoaId: c.candidato.pessoaId,
         nome: c.candidato.nome,
         ra: c.candidato.ra,
         outroRa: c.candidato.outroRa,
         cpfMascarado: mascararCpf(c.candidato.cpf),
         celular: veContato ? phone(c.candidato.celular) : mascararCelular(c.candidato.celular),
         email: c.candidato.email ? (veContato ? c.candidato.email : mascararEmail(c.candidato.email)) : null,
         optInWhatsapp: c.candidato.optInWhatsapp,
      },
      origem: c.origem,
      ingresso: { ano: c.ingresso.ano, semestre: c.ingresso.semestre, periodo: analiseDoCaso(c)?.periodoIngresso ?? null },
      responsaveis: {
         consultor: resumoUsuario(c.responsaveis.consultorId),
         analista: resumoUsuario(c.responsaveis.analistaId),
         coordenador: resumoUsuario(c.responsaveis.coordenadorId),
         matricula: resumoUsuario(c.responsaveis.matriculaId),
      },
      contadores: { ...docs, ...analise },
      resumoCongeladoEm: c.resumoCongeladoEm,
      noGed: c.noGed,
      jornada: c.jornada.map(p => ({ etapa: p.etapa, entrouEm: p.entrouEm, saiuEm: p.saiuEm, por: resumoUsuario(p.porId) })),
      acoesDisponiveis: acoesPara(c, u, agora),
      criadoEm: c.criadoEm,
      atualizadoEm: c.atualizadoEm,
   };
}

// ── Fila ───────────────────────────────────────────────────────────────────────────────────────

function etapasDoPapel(p: Papel): Etapa[] {
   return (Object.keys(PAPEL_DONO_DA_ETAPA) as Etapa[]).filter(e => PAPEL_DONO_DA_ETAPA[e] === p);
}

function estourado(c: CasoRegistro, agora: Date): boolean {
   return lerSla(sla(c), agora).estado === "ESTOURADO";
}

/** "Minha vez" por papel (docs/04 §1). Usuário com mais de um papel vê a união. */
function naMinhaVez(c: CasoRegistro, u: UsuarioMock, agora: Date): boolean {
   const meu = responsavelId(c) === u.id;
   return u.papeis.some(p => {
      switch (p) {
         case "CONSULTOR":
            return c.responsaveis.consultorId === u.id && ["RASCUNHO", "AGUARDANDO_DOCUMENTOS", "PROPOSTA_ENVIADA"].includes(c.etapa);
         case "ANALISTA":
            return ["EM_ANALISE", "AJUSTE_POS_COORDENACAO"].includes(c.etapa) && (meu || responsavelId(c) === null);
         case "COORDENADOR":
            return c.etapa === "AGUARDANDO_COORDENACAO" && u.cursosCoordenados.includes(c.destino.cursoId);
         case "MATRICULA":
            return ["PRONTO_PARA_MATRICULA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO"].includes(c.etapa) && (meu || responsavelId(c) === null);
         case "SUPORTE":
            return c.flags.ouvidoria;
         case "DIRETORIA":
         case "ADMIN":
            return c.flags.ouvidoria || c.flags.escalado || estourado(c, agora);
      }
   });
}

function naEquipe(c: CasoRegistro, u: UsuarioMock): boolean {
   const etapas = u.papeis.flatMap(etapasDoPapel);
   return etapas.length === 0 ? true : etapas.includes(c.etapa);
}

export interface ParametrosFila {
   visao: Visao;
   processo?: string | null;
   etapa: string | null;
   tipo: string | null;
   curso: string | null;
   turno: string | null;
   modalidade: string | null;
   responsavel: string | null;
   somenteAtrasados: boolean;
   comPendencia: boolean;
   ouvidoria: boolean;
   incluirEncerrados: boolean;
   ciclo: string | null;
   q: string | null;
   ordem: Ordem;
}

function casaBusca(c: CasoRegistro, q: string): boolean {
   const termo = q.trim();
   if (!termo) return true;
   const digitos = termo.replace(/\D/g, "");
   if (digitos.length >= 3 && digitos.length === termo.replace(/[.\-\s/]/g, "").length) {
      return (
         c.candidato.cpf.includes(digitos) || (c.candidato.ra ?? "").includes(digitos) || c.protocolo.replace(/\D/g, "").includes(digitos)
      );
   }
   const k = searchKey(termo);
   return searchKey(c.candidato.nome).includes(k) || c.protocolo.toLowerCase().includes(k);
}

export function filtrarFila(p: ParametrosFila, u: UsuarioMock, agora: Date): CasoRegistro[] {
   const lista = [...db.casos.values()].filter(c => {
      if (c.teste) return false;
      if (FINAIS.includes(c.etapa) && !p.incluirEncerrados && !p.q && p.etapa !== "TODAS" && !etapasDaFila(p.etapa).includes(c.etapa))
         return false;
      if (p.q && !casaBusca(c, p.q)) return false;
      if (!p.q && p.visao === "MINHA_VEZ" && !naMinhaVez(c, u, agora)) return false;
      if (!p.q && p.visao === "EQUIPE" && !naEquipe(c, u)) return false;
      if (!p.q && p.etapa && p.etapa !== "TODAS" && !etapasDaFila(p.etapa).includes(c.etapa)) return false;
      if (p.processo && !tiposDoProcesso(p.processo).includes(c.tipo)) return false;
      if (p.tipo && c.tipo !== p.tipo) return false;
      if (p.curso && c.destino.cursoId !== p.curso && !searchKey(c.destino.cursoNome).includes(searchKey(p.curso))) return false;
      if (p.turno && (p.turno === "DIURNO" ? c.destino.turno === "NOTURNO" : c.destino.turno !== p.turno)) return false;
      if (p.modalidade && c.destino.modalidade !== p.modalidade) return false;
      if (p.responsavel) {
         const r = responsavelId(c);
         if (p.responsavel === "SEM_RESPONSAVEL" ? r !== null || !PAPEL_DONO_DA_ETAPA[c.etapa] : r !== p.responsavel) return false;
      }
      if (p.somenteAtrasados && !estourado(c, agora)) return false;
      if (p.comPendencia && !c.pendencia) return false;
      if (p.ouvidoria && !(c.flags.ouvidoria || c.flags.escalado)) return false;
      if (p.ciclo && c.destino.ciclo !== p.ciclo) return false;
      return true;
   });
   const resumos = new Map(lista.map(c => [c.id, montarResumo(c)]));
   const ordenar: Record<Ordem, (a: CasoRegistro, b: CasoRegistro) => number> = {
      PRIORIDADE: (a, b) => compararPrioridade(agora)(resumos.get(a.id) as CasoResumo, resumos.get(b.id) as CasoResumo),
      MAIS_ANTIGOS: (a, b) => Date.parse(a.etapaDesde) - Date.parse(b.etapaDesde),
      SLA: (a, b) => (a.sla.venceEm ? Date.parse(a.sla.venceEm) : Infinity) - (b.sla.venceEm ? Date.parse(b.sla.venceEm) : Infinity),
      NOME: (a, b) => a.candidato.nome.localeCompare(b.candidato.nome, "pt-BR"),
   };
   return lista.sort(ordenar[p.ordem]);
}

export function contarAtrasados(casos: readonly CasoRegistro[], agora: Date): number {
   return casos.filter(c => estourado(c, agora)).length;
}

export function montarFunil(ciclo: string | null, agora: Date, processo: string | null = null): Funil {
   const doCiclo = [...db.casos.values()].filter(c => !c.teste && (!ciclo || c.destino.ciclo === ciclo));
   const ativos = processo ? doCiclo.filter(c => tiposDoProcesso(processo).includes(c.tipo)) : doCiclo;
   return {
      processos: PROCESSOS.map(p => {
         const doProcesso = doCiclo.filter(c => (p.tipos as readonly Tipo[]).includes(c.tipo));
         return {
            processo: p.id,
            total: doProcesso.length,
            emAndamento: doProcesso.filter(c => !FINAIS.includes(c.etapa)).length,
            atrasados: doProcesso.filter(c => estourado(c, agora)).length,
         };
      }),
      etapas: ETAPAS_DO_FUNIL.map(etapa => {
         const daEtapa = ativos.filter(c => c.etapa === etapa);
         const leituras = daEtapa.map(c => lerSla(sla(c), agora).estado);
         return {
            etapa,
            total: daEtapa.length,
            atrasados: leituras.filter(e => e === "ESTOURADO").length,
            emAtencao: leituras.filter(e => e === "ATENCAO").length,
         };
      }),
      atualizadoEm: agora.toISOString(),
   };
}

// ── Escrita ────────────────────────────────────────────────────────────────────────────────────

function prazoDaEtapa(etapa: Etapa, desde: Date): { venceEm: string | null; alertaEm: string | null } {
   const regra = (SLA_POR_ETAPA as Partial<Record<Etapa, RegraSla>>)[etapa];
   if (!regra) return { venceEm: null, alertaEm: null };
   const p = calcularPrazo(desde, regra, CALENDARIO_MOCK);
   return { venceEm: p.venceEm.toISOString(), alertaEm: p.alertaEm.toISOString() };
}

/** Menor carga ativa (docs/03 §7). A capacidade máxima vale só para analistas (docs/15 §7). */
function menorCarga(equipe: readonly UsuarioMock[], etapas: readonly Etapa[], campo: "analistaId" | "matriculaId"): string | null {
   const carga = new Map(equipe.map(u => [u.id, 0]));
   for (const c of db.casos.values()) {
      const id = c.responsaveis[campo];
      if (id && etapas.includes(c.etapa) && carga.has(id)) carga.set(id, (carga.get(id) ?? 0) + 1);
   }
   const limite = campo === "analistaId" ? DISTRIBUICAO.capacidadeMaxAtiva : Infinity;
   const disponiveis = [...carga.entries()].filter(([, n]) => n < limite).sort((a, b) => a[1] - b[1]);
   return disponiveis[0]?.[0] ?? null;
}

const valores = (c: CasoRegistro) => () => valoresDoCaso(c);

/** Envia um template ao candidato (o backend real chamaria o Blip) e registra na linha do tempo. */
export function enviarTemplate(c: CasoRegistro, templateId: string, autorId: string | null) {
   const t = templatePorId(templateId);
   if (!t) return null;
   const { texto } = preencher(t, templateId === "lembrete_documentos" ? valoresEmLinha(c) : valoresDoCaso(c));
   return registrarEvento(
      c,
      {
         tipo: "mensagem.enviada",
         categoria: "MENSAGEM",
         autor: autorId
            ? { tipo: "PESSOA", id: autorId, nome: resumoUsuario(autorId)?.nome ?? null }
            : { tipo: "SISTEMA", id: null, nome: null },
         titulo: `Mensagem enviada: ${t.nome.toLowerCase()}`,
         detalhe: texto,
         visivelAoCandidato: true,
         statusEntrega: "ENTREGUE",
         dados: { templateId, botoes: t.botoes },
      },
      valores(c),
   );
}

function iniciarPreAnalise(c: CasoRegistro, agora: Date): void {
   db.analises.delete(c.id);
   c.flags.preAnaliseFalhou = false;
   c.preAnalise = {
      status: "PROCESSANDO",
      iniciadaEm: agora.toISOString(),
      concluidaEm: null,
      modelo: "interno-v3",
      cobertura: { sugeridos: 0, total: 0 },
      avisos: [],
      erro: null,
   };
}

/** Pré-análise recém-concluída: só sugestões, nenhuma decisão (a IA nunca decide). */
function concluirPreAnalise(c: CasoRegistro, falhou: boolean, agora: Date): void {
   c.flags.preAnaliseFalhou = falhou;
   const nova = gerarAnalise(c, c.destino.matrizId ?? `${c.destino.cursoId}-20262`, agora);
   for (const i of nova.itens) {
      i.estado = "SUGERIDO";
      i.decisao = null;
      i.pergunta = null;
   }
   nova.periodoIngresso = null;
   // Troca de matriz/destino: decisões da análise anterior valem para as mesmas disciplinas.
   const anterior = db.analisesArquivadas.get(c.id);
   if (anterior) {
      for (const i of nova.itens) {
         const antes = anterior.itens.find(x => x.id === i.id);
         if (antes?.decisao && (antes.estado === "DECIDIDO" || antes.estado === "RESPONDIDO")) {
            i.estado = "DECIDIDO";
            i.decisao = antes.decisao;
         }
      }
      db.analisesArquivadas.delete(c.id);
   }
   db.analises.set(c.id, nova);
   c.preAnalise = {
      status: falhou ? "FALHOU" : "CONCLUIDA",
      iniciadaEm: c.preAnalise.iniciadaEm,
      concluidaEm: agora.toISOString(),
      modelo: "interno-v3",
      cobertura: cobertura(nova),
      avisos: [],
      erro: falhou ? "O serviço de pré-análise não respondeu a tempo." : null,
   };
}

const TITULO_EVENTO: Record<AcaoTransicao, string> = {
   ENVIAR_PROTOCOLO: "Protocolo enviado",
   DOCUMENTOS_COMPLETOS: "Documentos completos",
   CONCLUIR_PRE_ANALISE: "Pré-análise concluída",
   FALHAR_PRE_ANALISE: "Pré-análise não concluiu",
   ENVIAR_COORDENACAO: "Perguntas enviadas à coordenação",
   RESPONDER_COORDENACAO: "Coordenação devolveu para a analista",
   CONCLUIR_ANALISE: "Análise concluída",
   ENVIAR_PROPOSTA: "Proposta enviada pelo WhatsApp",
   REGISTRAR_RESPOSTA: "Resposta do candidato registrada",
   EFETIVAR_MATRICULA: "Matrícula efetivada",
   MARCAR_SEM_RETORNO: "Encerrado sem retorno do candidato",
   ENCERRAR_PERDIDO: "Encerrado como perdido",
   CANCELAR: "Caso cancelado",
   ADIAR: "Caso adiado",
   RETOMAR: "Caso retomado",
   SOLICITAR_REANALISE: "Reanálise solicitada",
   REABRIR: "Caso reaberto",
   ALTERAR_DESTINO: "Destino alterado",
};

function rotuloMotivo(acao: AcaoTransicao, motivo: string | undefined): string | null {
   if (!motivo) return null;
   const mapa: Record<string, Record<string, string>> = {
      ENCERRAR_PERDIDO: ROTULO_MOTIVO_PERDA,
      MARCAR_SEM_RETORNO: ROTULO_MOTIVO_PERDA,
      CANCELAR: ROTULO_MOTIVO_CANCELAMENTO,
      SOLICITAR_REANALISE: ROTULO_MOTIVO_REANALISE,
      ADIAR: ROTULO_MOTIVO_ADIAMENTO,
   };
   return mapa[acao]?.[motivo] ?? motivo;
}

/**
 * Executa a transição com as guardas da máquina (lança `ErroTransicao`) e aplica os efeitos
 * colaterais de docs/03 §3: distribuição, régua de mensagens, pré-análise, congelamento do resumo.
 */
export function aplicarTransicao(c: CasoRegistro, entrada: EntradaTransicao, quem: UsuarioMock | null, agora: Date): void {
   const atorTransicao: Ator = quem ? ator(quem) : { tipo: "SISTEMA" };
   const res = transicionar(entrada.acao, { caso: paraMaquina(c), ator: atorTransicao, payload: entrada, agora });
   const quando = agora.toISOString();
   const autorId = quem?.id ?? null;

   const atual = c.jornada[c.jornada.length - 1];
   if (atual && !atual.saiuEm) atual.saiuEm = quando;
   c.jornada.push({ etapa: res.para, entrouEm: quando, saiuEm: null, porId: autorId });
   c.etapaAnterior = res.de;
   c.etapa = res.para;
   c.etapaDesde = quando;
   c.sla = prazoDaEtapa(res.para, agora);
   c.versao += 1;
   c.atualizadoEm = quando;
   c.ultimoAutorId = autorId;

   switch (entrada.acao) {
      case "ENVIAR_PROTOCOLO":
         if (res.para === "AGUARDANDO_DOCUMENTOS") enviarTemplate(c, "protocolo_aberto", null);
         else iniciarPreAnalise(c, agora);
         break;
      case "DOCUMENTOS_COMPLETOS":
         c.noGed = true;
         enviarTemplate(c, "documentos_completos", null);
         iniciarPreAnalise(c, agora);
         break;
      case "CONCLUIR_PRE_ANALISE":
      case "FALHAR_PRE_ANALISE":
         concluirPreAnalise(c, entrada.acao === "FALHAR_PRE_ANALISE", agora);
         c.responsaveis.analistaId ??= menorCarga(ANALISTAS, ["EM_ANALISE", "AJUSTE_POS_COORDENACAO"], "analistaId");
         notificar(c.responsaveis.analistaId, {
            tipo: "ATRIBUIDO",
            casoId: c.id,
            titulo: "Caso atribuído a você",
            detalhe: `${c.candidato.nome} · ${c.destino.cursoNome}`,
         });
         break;
      case "ENVIAR_COORDENACAO":
         notificar(c.responsaveis.coordenadorId, {
            tipo: "PERGUNTA_COORDENACAO",
            casoId: c.id,
            titulo: "Perguntas da análise para você",
            detalhe: `${c.candidato.nome} · ${c.destino.cursoNome}`,
         });
         break;
      case "RESPONDER_COORDENACAO":
         notificar(c.responsaveis.analistaId, {
            tipo: "RESPOSTA_COORDENACAO",
            casoId: c.id,
            titulo: "Coordenação respondeu",
            detalhe: c.candidato.nome,
         });
         break;
      case "CONCLUIR_ANALISE": {
         const analise = analiseDoCaso(c);
         c.resumoCongelado = analise ? calcularResumo(analise) : null;
         c.resumoCongeladoEm = quando;
         // Aproveitamento de estudos termina aqui: não vai para a equipe de matrícula.
         if (terminaNaAnalise(c.tipo)) break;
         c.responsaveis.matriculaId ??= menorCarga(
            MATRICULA,
            ["PRONTO_PARA_MATRICULA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO"],
            "matriculaId",
         );
         // Condição financeira vem do sistema financeiro [TI]; aqui chega junto com a conclusão.
         c.proposta.financeiro ??= {
            mensalidade: 989,
            descontoPercentual: 15,
            bolsa: null,
            parcelas: 6,
            validadeAte: new Date(agora.getTime() + 15 * 86_400_000).toISOString().slice(0, 10),
            observacao: null,
         };
         notificar(c.responsaveis.matriculaId, {
            tipo: "ATRIBUIDO",
            casoId: c.id,
            titulo: "Pronto para matrícula",
            detalhe: `${c.candidato.nome} · primeiro contato`,
         });
         break;
      }
      case "ENVIAR_PROPOSTA":
         c.proposta.enviadaEm = quando;
         enviarTemplate(c, "proposta_pronta", autorId);
         break;
      case "REGISTRAR_RESPOSTA": {
         const tipo = (
            ["INTERESSE", "SEM_INTERESSE", "DUVIDA"].includes(entrada.motivo ?? "") ? entrada.motivo : "INTERESSE"
         ) as TipoResposta;
         c.proposta.resposta = { tipo, em: quando, canal: quem ? "REGISTRO_MANUAL" : "WHATSAPP" };
         if (!quem)
            notificar(c.responsaveis.matriculaId, {
               tipo: "MENSAGEM_CANDIDATO",
               casoId: c.id,
               titulo: "Candidato respondeu a proposta",
               detalhe: c.candidato.nome,
            });
         break;
      }
      case "EFETIVAR_MATRICULA":
         for (const protocolo of db.casos.values()) {
            if (protocolo.candidato.pessoaId === c.candidato.pessoaId) {
               const mudou = !protocolo.matriculado || protocolo.candidato.ra === null;
               protocolo.matriculado = true;
               protocolo.candidato.ra ??= c.candidato.ra ?? gerarRa(criarPrng(`ra-${c.candidato.pessoaId}`));
               if (protocolo.id !== c.id && mudou) {
                  protocolo.versao += 1;
                  protocolo.atualizadoEm = quando;
                  protocolo.ultimoAutorId = autorId;
                  registrarEvento(
                     protocolo,
                     {
                        tipo: "matricula.vinculo_atualizado",
                        categoria: "SISTEMA",
                        autor: quem ? { tipo: "PESSOA", id: quem.id, nome: quem.nome } : { tipo: "SISTEMA", id: null, nome: "Sistema" },
                        titulo: "Matrícula do aluno atualizada",
                        detalhe: `Matrícula registrada no protocolo ${c.protocolo}. Esta análise mantém sua etapa.`,
                        visivelAoCandidato: false,
                        statusEntrega: null,
                     },
                     () => valoresDoCaso(protocolo),
                  );
               }
            }
         }
         c.candidato.ra ??= gerarRa(criarPrng(`ra-${c.id}`));
         enviarTemplate(c, "matricula_confirmada", null);
         break;
      case "MARCAR_SEM_RETORNO":
         c.motivoEncerramento = "SEM_RETORNO";
         enviarTemplate(c, "encerramento_porta_aberta", null);
         break;
      case "ENCERRAR_PERDIDO":
      case "CANCELAR":
         c.motivoEncerramento = entrada.motivo ?? null;
         c.teste = entrada.motivo === "TESTE";
         break;
      case "ADIAR":
         c.retomarEm = entrada.retomarEm ?? null;
         c.sla = { venceEm: null, alertaEm: null };
         break;
      case "RETOMAR":
         c.retomarEm = null;
         if (res.para === "PRE_ANALISE") iniciarPreAnalise(c, agora);
         break;
      case "SOLICITAR_REANALISE": {
         c.reanalises += 1;
         c.resumoCongelado = null;
         c.resumoCongeladoEm = null;
         // A contestação fica em cada disciplina marcada; para a coordenação, cada uma vira pergunta.
         const analise = analiseDoCaso(c);
         const paraCoordenacao = entrada.destinoReanalise === "COORDENACAO";
         const por = resumoUsuario(autorId) ?? { id: "u-sistema", nome: "Sistema" };
         if (analise) {
            for (const item of analise.itens.filter(i => entrada.itemIds?.includes(i.id))) {
               item.contestacao = { texto: entrada.texto ?? "", por, em: quando };
               if (paraCoordenacao) {
                  const atual = item.decisao?.valor ?? item.sugestao?.decisao ?? "DISPENSA";
                  item.estado = "PERGUNTA_ABERTA";
                  item.pergunta = {
                     texto: `O aluno contestou: ${entrada.texto ?? ""}`.trim(),
                     decisaoSugerida: atual,
                     por,
                     em: quando,
                     resposta: null,
                  };
               }
            }
            analise.versao += 1;
         }
         notificar(paraCoordenacao ? c.responsaveis.coordenadorId : c.responsaveis.analistaId, {
            tipo: paraCoordenacao ? "PERGUNTA_COORDENACAO" : "ATRIBUIDO",
            casoId: c.id,
            titulo: paraCoordenacao ? "Contestação para o seu parecer" : "Análise reaberta",
            detalhe: c.candidato.nome,
         });
         break;
      }
      case "REABRIR":
         c.motivoEncerramento = null;
         break;
      case "ALTERAR_DESTINO": {
         const atualAnalise = db.analises.get(c.id);
         const mesmoCurso = !entrada.novoDestino || entrada.novoDestino.cursoId === c.destino.cursoId;
         if (atualAnalise && mesmoCurso) db.analisesArquivadas.set(c.id, atualAnalise);
         if (entrada.novoDestino) c.destino = { ...entrada.novoDestino, ciclo: c.destino.ciclo };
         c.resumoCongelado = null;
         c.resumoCongeladoEm = null;
         c.responsaveis.coordenadorId = `u-coo-${c.destino.cursoId}`;
         if (res.para === "PRE_ANALISE") iniciarPreAnalise(c, agora);
         else db.analises.delete(c.id);
         break;
      }
   }

   const motivo = rotuloMotivo(entrada.acao, entrada.motivo);
   registrarEvento(
      c,
      {
         tipo: res.evento.tipo,
         categoria:
            ["CONCLUIR_PRE_ANALISE", "FALHAR_PRE_ANALISE", "DOCUMENTOS_COMPLETOS", "RETOMAR"].includes(entrada.acao) && !quem
               ? "SISTEMA"
               : "DECISAO",
         autor: quem
            ? { tipo: "PESSOA", id: quem.id, nome: quem.nome }
            : entrada.acao.includes("PRE_ANALISE")
              ? { tipo: "IA", id: null, nome: "Pré-análise" }
              : { tipo: "SISTEMA", id: null, nome: null },
         titulo: TITULO_EVENTO[entrada.acao],
         detalhe: [motivo, entrada.texto].filter(Boolean).join(" · ") || null,
         visivelAoCandidato: false,
         statusEntrega: null,
         dados: { acao: entrada.acao, de: res.de, para: res.para },
      },
      valores(c),
   );
}

/** Atribuir responsável na etapa atual (ou assumir). */
export function atribuir(c: CasoRegistro, usuarioId: string, quem: UsuarioMock, agora: Date): void {
   const dono = PAPEL_DONO_DA_ETAPA[c.etapa];
   const alvo = resumoUsuario(usuarioId);
   if (dono === "ANALISTA") c.responsaveis.analistaId = usuarioId;
   else if (dono === "MATRICULA") c.responsaveis.matriculaId = usuarioId;
   else if (dono === "CONSULTOR") c.responsaveis.consultorId = usuarioId;
   else if (dono === "COORDENADOR") c.responsaveis.coordenadorId = usuarioId;
   c.versao += 1;
   c.atualizadoEm = agora.toISOString();
   c.ultimoAutorId = quem.id;
   if (usuarioId !== quem.id)
      notificar(usuarioId, {
         tipo: "ATRIBUIDO",
         casoId: c.id,
         titulo: "Caso atribuído a você",
         detalhe: `${c.candidato.nome} · por ${quem.nome}`,
      });
   registrarEvento(
      c,
      {
         tipo: "caso.atribuido",
         categoria: "SISTEMA",
         autor: { tipo: "PESSOA", id: quem.id, nome: quem.nome },
         titulo: usuarioId === quem.id ? `${quem.nome} assumiu o caso` : `Atribuído para ${alvo?.nome ?? "outra pessoa"}`,
         detalhe: null,
         visivelAoCandidato: false,
         statusEntrega: null,
      },
      valores(c),
   );
}

// ── Automação (o "sistema trabalha") ───────────────────────────────────────────────────────────

/**
 * Roda a cada pedido: conclui pré-análises (cerca de 20 s), retoma adiados na data, encerra
 * propostas sem retorno (D+7), libera pendências vencidas e simula a resposta do candidato no
 * roteiro da matrícula.
 */
export function tick(agora: Date): void {
   for (const c of db.casos.values()) {
      try {
         if (c.etapa === "PRE_ANALISE" && c.preAnalise.status === "PROCESSANDO" && c.preAnalise.iniciadaEm) {
            if (agora.getTime() - Date.parse(c.preAnalise.iniciadaEm) >= SEGUNDOS_PRE_ANALISE * 1000) {
               const falha = hash(`${c.id}-${c.preAnalise.iniciadaEm}`) % 10 === 0;
               aplicarTransicao(c, { acao: falha ? "FALHAR_PRE_ANALISE" : "CONCLUIR_PRE_ANALISE" }, null, agora);
            }
         } else if (c.etapa === "ADIADO" && c.retomarEm && Date.parse(c.retomarEm) <= agora.getTime()) {
            aplicarTransicao(c, { acao: "RETOMAR" }, null, agora);
         } else if (c.etapa === "PROPOSTA_ENVIADA" && c.proposta.enviadaEm) {
            const desde = agora.getTime() - Date.parse(c.proposta.enviadaEm);
            if (c.roteiro === "MATRICULA" && desde >= SEGUNDOS_RESPOSTA_SIMULADA * 1000) {
               registrarEvento(
                  c,
                  {
                     tipo: "mensagem.recebida",
                     categoria: "MENSAGEM",
                     autor: { tipo: "CANDIDATO", id: null, nome: c.candidato.nome.split(" ")[0] },
                     titulo: "Candidato respondeu",
                     detalhe: "Quero saber",
                     visivelAoCandidato: true,
                     statusEntrega: null,
                  },
                  valores(c),
               );
               aplicarTransicao(c, { acao: "REGISTRAR_RESPOSTA", motivo: "INTERESSE" }, null, agora);
            } else if (desde >= 7 * 86_400_000) {
               aplicarTransicao(c, { acao: "MARCAR_SEM_RETORNO" }, null, agora);
            }
         }
         if (c.pendencia && Date.parse(c.pendencia.revisarEm) <= agora.getTime()) {
            notificar(responsavelId(c), {
               tipo: "SLA_ATENCAO",
               casoId: c.id,
               titulo: "Pendência externa venceu",
               detalhe: "O prazo voltou a contar. Revise o caso.",
            });
            c.pendencia = null;
         }
      } catch {
         // Uma guarda que falha numa automação não pode derrubar a simulação dos outros casos.
      }
   }
}

/** Documentos todos aceitos: o sistema avança sozinho (DOCUMENTOS_COMPLETOS). */
export function verificarDocumentosCompletos(c: CasoRegistro, agora: Date): boolean {
   if (c.etapa !== "AGUARDANDO_DOCUMENTOS" || !checklistCompleto(documentosDoCaso(c))) return false;
   aplicarTransicao(c, { acao: "DOCUMENTOS_COMPLETOS" }, null, agora);
   return true;
}
