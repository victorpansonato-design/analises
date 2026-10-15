/**
 * Semente dos casos (~340), relativa ao momento em que os mocks sobem: SLAs no prazo, em atenção e
 * estourados, casos pausados, com ouvidoria, com pré-análise falha e com reanálise. Estrutura
 * determinística (PRNG com semente fixa); só os horários acompanham o relógio, para os prazos serem
 * plausíveis em qualquer dia.
 *
 * Os primeiros casos são roteiros de demonstração, um por papel (ids estáveis, bons para colar link).
 */
import { SLA_POR_ETAPA, type Etapa, type PendenciaExterna, type Tipo } from "@/features/casos";

import { criarPrng, type Prng } from "@/mocks/lib/prng";
import type { CasoRegistro, PassoRegistro, RoteiroDemo } from "@/mocks/db/tipos";
import { CICLOS, CURSOS, IES_FICTICIAS, cursoPorId } from "@/mocks/seed/cursos";
import { gerarCelular, gerarCpf, gerarEmail, gerarNome, gerarRa } from "@/mocks/seed/pessoas";
import { ANALISTAS, CONSULTORES, MATRICULA } from "@/mocks/seed/usuarios";

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

const DISTRIBUICAO: readonly (readonly [Etapa, number])[] = [
   ["AGUARDANDO_DOCUMENTOS", 86],
   ["PRE_ANALISE", 3],
   ["EM_ANALISE", 27],
   ["AGUARDANDO_COORDENACAO", 38],
   ["AJUSTE_POS_COORDENACAO", 7],
   ["PRONTO_PARA_MATRICULA", 40],
   ["PROPOSTA_ENVIADA", 54],
   ["EM_NEGOCIACAO", 16],
   ["ADIADO", 6],
   ["RASCUNHO", 2],
   ["MATRICULADO", 30],
   ["PERDIDO", 18],
   ["CANCELADO", 5],
];

/** Aproveitamento de estudos: aluno ativo; termina em "Concluído" (sem proposta nem matrícula). */
const DISTRIBUICAO_APROVEITAMENTO: readonly (readonly [Etapa, number])[] = [
   ["AGUARDANDO_DOCUMENTOS", 9],
   ["PRE_ANALISE", 1],
   ["EM_ANALISE", 8],
   ["AGUARDANDO_COORDENACAO", 4],
   ["AJUSTE_POS_COORDENACAO", 2],
   ["CONCLUIDO", 12],
   ["PERDIDO", 1],
   ["CANCELADO", 1],
];

const MENSALIDADE: Record<string, number> = { adm: 989, dir: 1890, eng: 1650, psi: 1590, cc: 1290, enf: 1450, cont: 949, ped: 789 };

const CURSOS_ORIGEM: Record<string, string[]> = {
   adm: ["Gestão Empresarial", "Administração", "Processos Gerenciais"],
   dir: ["Direito", "Ciências Jurídicas"],
   eng: ["Engenharia Civil", "Engenharia de Produção", "Arquitetura e Urbanismo"],
   psi: ["Psicologia", "Pedagogia"],
   cc: ["Sistemas de Informação", "Análise e Desenvolvimento de Sistemas", "Ciência da Computação"],
   enf: ["Enfermagem", "Biomedicina"],
   cont: ["Ciências Contábeis", "Administração"],
   ped: ["Pedagogia", "Letras"],
};

/** Ordem em que um caso percorre as etapas (docs/03 §2). */
function caminho(tipo: Tipo, estudouFora: boolean | null, passouCoordenacao: boolean): Etapa[] {
   const docs =
      tipo === "TRANSFERENCIA_EXTERNA" ||
      tipo === "PORTADOR_DIPLOMA" ||
      tipo === "APROVEITAMENTO_ESTUDOS" ||
      (tipo === "RETORNO" && estudouFora === true);
   if (tipo === "APROVEITAMENTO_ESTUDOS")
      return [
         ...(docs ? (["AGUARDANDO_DOCUMENTOS"] as const) : []),
         "PRE_ANALISE",
         "EM_ANALISE",
         ...(passouCoordenacao ? (["AGUARDANDO_COORDENACAO", "AJUSTE_POS_COORDENACAO"] as const) : []),
         "CONCLUIDO",
      ];
   return [
      ...(docs ? (["AGUARDANDO_DOCUMENTOS"] as const) : []),
      "PRE_ANALISE",
      "EM_ANALISE",
      ...(passouCoordenacao ? (["AGUARDANDO_COORDENACAO", "AJUSTE_POS_COORDENACAO"] as const) : []),
      "PRONTO_PARA_MATRICULA",
      "PROPOSTA_ENVIADA",
      "EM_NEGOCIACAO",
      "MATRICULADO",
   ];
}

function quemEntrou(etapa: Etapa, r: Pick<CasoRegistro, "responsaveis">): string | null {
   switch (etapa) {
      case "AGUARDANDO_DOCUMENTOS":
      case "RASCUNHO":
         return r.responsaveis.consultorId;
      case "AGUARDANDO_COORDENACAO":
      case "PRONTO_PARA_MATRICULA":
      case "CONCLUIDO":
         return r.responsaveis.analistaId;
      case "AJUSTE_POS_COORDENACAO":
         return r.responsaveis.coordenadorId;
      case "PROPOSTA_ENVIADA":
      case "MATRICULADO":
         return r.responsaveis.matriculaId;
      default:
         return null;
   }
}

type AlvoSla = "NO_PRAZO" | "ATENCAO" | "ESTOURADO";

function prazo(etapa: Etapa, alvo: AlvoSla, agora: number, r: Prng): { venceEm: string | null; alertaEm: string | null; desde: number } {
   const regra = (SLA_POR_ETAPA as Record<string, { minutos: number; alertaEm: number } | undefined>)[etapa];
   if (!regra) return { venceEm: null, alertaEm: null, desde: agora - r.int(1, 120) * HORA };
   const dur = regra.minutos * MIN;
   const restante =
      alvo === "NO_PRAZO"
         ? dur * (0.25 + r.next() * 0.55)
         : alvo === "ATENCAO"
           ? dur * (0.03 + r.next() * 0.12)
           : -dur * (0.05 + r.next() * 0.9);
   const vence = agora + restante;
   return {
      venceEm: new Date(vence).toISOString(),
      alertaEm: new Date(vence - dur * (1 - regra.alertaEm)).toISOString(),
      desde: vence - dur,
   };
}

/** Quanto uma etapa já concluída durou: cerca de 85% dentro do SLA dela (semente realista, não pessimista). */
function duracaoPassada(etapa: Etapa, r: Prng): number {
   const regra = (SLA_POR_ETAPA as Record<string, { minutos: number } | undefined>)[etapa];
   if (!regra) return r.int(2, 40) * HORA;
   const fator = r.chance(0.85) ? 0.25 + r.next() * 0.65 : 1.1 + r.next() * 0.9;
   return Math.max(5 * MIN, regra.minutos * MIN * fator);
}

function montarJornada(etapas: Etapa[], desdeAtual: number, r: Prng, caso: Pick<CasoRegistro, "responsaveis">): PassoRegistro[] {
   const passos: PassoRegistro[] = [];
   let fim = desdeAtual;
   for (let i = etapas.length - 1; i >= 0; i--) {
      const entrou = i === etapas.length - 1 ? desdeAtual : fim - duracaoPassada(etapas[i], r);
      passos.unshift({
         etapa: etapas[i],
         entrouEm: new Date(entrou).toISOString(),
         saiuEm: i === etapas.length - 1 ? null : new Date(fim).toISOString(),
         porId: quemEntrou(etapas[i], caso),
      });
      fim = entrou;
   }
   return passos;
}

interface OpcoesCaso {
   id?: string;
   etapa: Etapa;
   tipo?: Tipo;
   cursoId?: string;
   alvo?: AlvoSla;
   restanteMin?: number;
   consultorId?: string;
   analistaId?: string | null;
   matriculaId?: string | null;
   roteiro?: RoteiroDemo;
}

function criarCaso(n: number, o: OpcoesCaso, agora: number): CasoRegistro {
   const r = criarPrng(`caso-${o.id ?? n}`);
   const precisaDocs = o.etapa === "AGUARDANDO_DOCUMENTOS";
   const tipo: Tipo =
      o.tipo ??
      (precisaDocs
         ? r.weighted([
              ["TRANSFERENCIA_EXTERNA", 6],
              ["PORTADOR_DIPLOMA", 3],
              ["RETORNO", 1],
           ] as const)
         : r.weighted([
              ["TRANSFERENCIA_EXTERNA", 5],
              ["PORTADOR_DIPLOMA", 2],
              ["TRANSFERENCIA_INTERNA", 1.5],
              ["RETORNO", 1.5],
           ] as const));
   // Retorno que espera documentos externos é, por definição, sem vínculo e estudou fora no período.
   const subtipo =
      tipo === "RETORNO"
         ? precisaDocs
            ? "SEM_VINCULO"
            : r.weighted([
                 ["SEM_VINCULO", 3],
                 ["COM_VINCULO_ALTERACAO_CURRICULAR", 1],
              ] as const)
         : null;
   const estudouFora = tipo === "RETORNO" && subtipo === "SEM_VINCULO" ? precisaDocs || r.chance(0.3) : null;
   const curso = o.cursoId
      ? cursoPorId(o.cursoId)
      : r.weighted(CURSOS.map(c => [c, c.id === "adm" || c.id === "dir" ? 3 : c.id === "psi" || c.id === "enf" ? 2 : 1.5] as const));
   const nome = gerarNome(r);
   const interno = tipo === "TRANSFERENCIA_INTERNA" || tipo === "RETORNO" || tipo === "APROVEITAMENTO_ESTUDOS";
   const ies = r.pick(IES_FICTICIAS);
   const alvo: AlvoSla =
      o.alvo ??
      r.weighted([
         ["NO_PRAZO", 70],
         ["ATENCAO", 15],
         ["ESTOURADO", 15],
      ] as const);

   const ativo = !["MATRICULADO", "CONCLUIDO", "PERDIDO", "CANCELADO"].includes(o.etapa);
   const posAnalise = [
      "AGUARDANDO_COORDENACAO",
      "AJUSTE_POS_COORDENACAO",
      "PRONTO_PARA_MATRICULA",
      "PROPOSTA_ENVIADA",
      "EM_NEGOCIACAO",
      "MATRICULADO",
      "CONCLUIDO",
   ].includes(o.etapa);
   const emAnalise = ["EM_ANALISE", "AGUARDANDO_COORDENACAO", "AJUSTE_POS_COORDENACAO"].includes(o.etapa) || posAnalise;
   const naMatricula = ["PRONTO_PARA_MATRICULA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO", "MATRICULADO"].includes(o.etapa);

   const responsaveis = {
      consultorId: o.consultorId ?? r.weighted(CONSULTORES.map((c, i) => [c.id, i === 0 ? 3 : 1.5] as const)),
      analistaId:
         o.analistaId !== undefined
            ? o.analistaId
            : emAnalise || o.etapa === "PERDIDO"
              ? r.weighted(ANALISTAS.map((a, i) => [a.id, i === 0 ? 2.5 : 1.5] as const))
              : null,
      coordenadorId: curso.coordenadorId,
      matriculaId:
         o.matriculaId !== undefined
            ? o.matriculaId
            : naMatricula
              ? r.weighted(MATRICULA.map((m, i) => [m.id, i === 0 ? 2 : 1.5] as const))
              : null,
   };

   let sla: { venceEm: string | null; alertaEm: string | null };
   let desde: number;
   if (o.restanteMin !== undefined) {
      const regra = (SLA_POR_ETAPA as Record<string, { minutos: number; alertaEm: number } | undefined>)[o.etapa];
      const dur = (regra?.minutos ?? 120) * MIN;
      const vence = agora + o.restanteMin * MIN;
      sla = { venceEm: new Date(vence).toISOString(), alertaEm: new Date(vence - dur * (1 - (regra?.alertaEm ?? 0.8))).toISOString() };
      desde = vence - dur;
   } else if (ativo && o.etapa !== "ADIADO" && o.etapa !== "RASCUNHO" && o.etapa !== "PROPOSTA_ENVIADA") {
      const p = prazo(o.etapa, alvo, agora, r);
      sla = { venceEm: p.venceEm, alertaEm: p.alertaEm };
      desde = o.etapa === "PRE_ANALISE" ? agora - r.int(1, 6) * 1000 : p.desde;
   } else {
      sla = { venceEm: null, alertaEm: null };
      desde =
         o.etapa === "PROPOSTA_ENVIADA"
            ? agora - (r.int(3, 150) / 24) * DIA
            : o.etapa === "RASCUNHO"
              ? agora - r.int(10, 300) * MIN
              : agora - r.int(1, 45) * DIA;
   }

   const passouCoordenacao = ["AGUARDANDO_COORDENACAO", "AJUSTE_POS_COORDENACAO"].includes(o.etapa) || (posAnalise && r.chance(0.35));
   const percurso = caminho(tipo, estudouFora, passouCoordenacao);
   let etapasAte: Etapa[];
   let etapaAnterior: Etapa | null = null;
   if (o.etapa === "PERDIDO" || o.etapa === "CANCELADO" || o.etapa === "ADIADO") {
      const ate =
         o.etapa === "CANCELADO"
            ? 1
            : o.etapa === "ADIADO"
              ? Math.max(1, percurso.indexOf(r.pick(["PRONTO_PARA_MATRICULA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO"] as const)) + 1)
              : r.int(2, percurso.length - 1);
      etapasAte = [...percurso.slice(0, ate), o.etapa];
      etapaAnterior = etapasAte[etapasAte.length - 2] ?? null;
   } else if (o.etapa === "RASCUNHO") {
      etapasAte = ["RASCUNHO"];
   } else {
      const idx = percurso.indexOf(o.etapa);
      etapasAte = idx < 0 ? [o.etapa] : percurso.slice(0, idx + 1);
      etapaAnterior = etapasAte[etapasAte.length - 2] ?? null;
   }
   const jornada = montarJornada(etapasAte, desde, r, { responsaveis });
   const criadoEm = jornada[0].entrouEm;

   const pendencia: PendenciaExterna | null =
      ativo && o.etapa !== "ADIADO" && !o.roteiro && r.chance(0.05)
         ? {
              tipo: r.pick(["EDITAL_DP", "VAGA", "DOCUMENTO_IES_ORIGEM", "DECISAO_ACADEMICA"] as const),
              descricao: undefined,
              revisarEm: new Date(agora + r.int(2, 15) * DIA).toISOString(),
           }
         : null;

   const temFinanceiro = naMatricula && (o.etapa !== "PRONTO_PARA_MATRICULA" || r.chance(0.85) || o.roteiro === "MATRICULA");
   const reprovou = o.etapa === "PERDIDO";
   const cpf = gerarCpf(r);
   const protocolo = String(85000 + n * 7);

   return {
      id: o.id ?? `c-${String(1000 + n).padStart(6, "0")}`,
      protocolo,
      tipo,
      subtipo,
      etapa: o.etapa,
      etapaAnterior,
      etapaDesde: jornada[jornada.length - 1].entrouEm,
      criadoEm,
      atualizadoEm: jornada[jornada.length - 1].entrouEm,
      versao: r.int(2, 14),
      matriculado: o.etapa === "MATRICULADO" || tipo === "APROVEITAMENTO_ESTUDOS" || (interno && r.chance(0.65)),
      ultimoAutorId: jornada[jornada.length - 1].porId,
      candidato: {
         pessoaId: `p-${String(5000 + n).padStart(6, "0")}`,
         nome,
         ra: interno || o.etapa === "MATRICULADO" ? gerarRa(r) : null,
         outroRa: tipo === "RETORNO" && r.chance(0.3) ? gerarRa(r) : null,
         cpf,
         celular: gerarCelular(r),
         email: r.chance(0.92) ? gerarEmail(nome, r) : null,
         optInWhatsapp: o.roteiro ? true : r.chance(0.93),
      },
      destino: {
         cursoId: curso.id,
         cursoNome: curso.nome,
         turno: r.pick(curso.turnos),
         modalidade: r.pick(curso.modalidades),
         matrizId: `${curso.id}-20262`,
         ciclo: o.roteiro
            ? "2027.1"
            : r.weighted([
                 [CICLOS[1], 85],
                 [CICLOS[0], 15],
              ] as const),
      },
      origem:
         interno && tipo !== "APROVEITAMENTO_ESTUDOS"
            ? {
                 iesNome: estudouFora ? ies.nome : null,
                 cursoNome: estudouFora ? r.pick(CURSOS_ORIGEM[curso.id]) : null,
                 estudouForaNoPeriodo: estudouFora,
              }
            : { iesNome: ies.nome, cursoNome: r.pick(CURSOS_ORIGEM[curso.id]), estudouForaNoPeriodo: null },
      ingresso: { ano: 2027, semestre: 1 },
      responsaveis,
      sla,
      pendencia,
      retomarEm: o.etapa === "ADIADO" ? new Date(agora + r.int(3, 40) * DIA).toISOString() : null,
      flags: {
         ouvidoria: ativo && !o.roteiro && r.chance(0.035),
         escalado: o.etapa === "AGUARDANDO_COORDENACAO" && alvo === "ESTOURADO" && r.chance(0.4),
         preAnaliseFalhou: o.etapa === "EM_ANALISE" && !o.roteiro && r.chance(0.08),
      },
      reanalises: o.etapa === "EM_ANALISE" && !o.roteiro && r.chance(0.08) ? 1 : 0,
      jornada,
      resumoCongeladoEm: naMatricula ? (jornada.find(p => p.etapa === "PRONTO_PARA_MATRICULA")?.entrouEm ?? null) : null,
      resumoCongelado: null,
      noGed: !precisaDocs && o.etapa !== "RASCUNHO",
      preAnalise: {
         status: o.etapa === "PRE_ANALISE" ? "PROCESSANDO" : emAnalise ? "CONCLUIDA" : "PENDENTE",
         iniciadaEm:
            o.etapa === "PRE_ANALISE"
               ? new Date(desde).toISOString()
               : emAnalise
                 ? (jornada.find(p => p.etapa === "PRE_ANALISE")?.entrouEm ?? null)
                 : null,
         concluidaEm: emAnalise ? (jornada.find(p => p.etapa === "EM_ANALISE")?.entrouEm ?? null) : null,
         modelo: emAnalise || o.etapa === "PRE_ANALISE" ? "interno-v3" : null,
         cobertura: { sugeridos: 0, total: 0 },
         avisos: [],
         erro: null,
      },
      proposta: {
         financeiro: temFinanceiro
            ? {
                 mensalidade: MENSALIDADE[curso.id],
                 descontoPercentual: r.pick([null, 10, 15, 20, 30]),
                 bolsa: r.chance(0.2) ? "Bolsa transferência" : null,
                 parcelas: 6,
                 validadeAte: new Date(agora + 15 * DIA).toISOString().slice(0, 10),
                 observacao: null,
              }
            : null,
         pendenciaFinanceiraAnterior: tipo === "RETORNO" ? r.chance(0.25) : null,
         resposta:
            o.etapa === "EM_NEGOCIACAO" || o.etapa === "MATRICULADO"
               ? { tipo: r.chance(0.7) ? "INTERESSE" : "DUVIDA", em: new Date(desde).toISOString(), canal: "WHATSAPP" }
               : null,
         aceite:
            o.etapa === "MATRICULADO"
               ? {
                    canal: r.pick(["WHATSAPP", "TELEFONE", "PRESENCIAL"]),
                    em: jornada[jornada.length - 1].entrouEm,
                    porId: responsaveis.matriculaId ?? MATRICULA[0].id,
                 }
               : null,
         enviadaEm: ["PROPOSTA_ENVIADA", "EM_NEGOCIACAO", "MATRICULADO"].includes(o.etapa)
            ? (jornada.find(p => p.etapa === "PROPOSTA_ENVIADA")?.entrouEm ?? null)
            : null,
      },
      motivoEncerramento: reprovou
         ? r.pick([
              "FECHOU_OUTRA_IES",
              "FINANCEIRO",
              "APROVEITAMENTO_ABAIXO_DO_ESPERADO",
              "SEM_RETORNO",
              "HORARIO_TURNO",
              "DESISTIU_DO_CURSO",
              "DOCUMENTACAO_INCOMPLETA",
           ])
         : o.etapa === "CANCELADO"
           ? r.pick(["DUPLICADO", "ABERTO_POR_ENGANO", "PEDIDO_DO_CANDIDATO_ANTES_DA_ANALISE", "TESTE"])
           : null,
      dadosVestibular: r.chance(0.4)
         ? {
              Processo: r.pick(["Vestibular 2026.2", "Vestibular agendado", "ENEM 2025"]),
              "Forma de ingresso": r.pick(["Vestibular", "ENEM", "Transferência"]),
              "Nota da redação": r.int(480, 920),
              Classificação: r.int(12, 380),
           }
         : null,
      semente: r.int(1, 2 ** 31 - 1),
      roteiro: o.roteiro ?? null,
      teste: false,
   };
}

/** Casos de demonstração: um roteiro por papel, com ids estáveis. */
function roteiros(agora: number): CasoRegistro[] {
   return [
      criarCaso(
         -1,
         {
            id: "c-demo-analise",
            etapa: "EM_ANALISE",
            tipo: "TRANSFERENCIA_EXTERNA",
            cursoId: "adm",
            restanteMin: 300,
            analistaId: ANALISTAS[0].id,
            roteiro: "ANALISE_45",
         },
         agora,
      ),
      criarCaso(
         -2,
         {
            id: "c-demo-coordenacao",
            etapa: "AGUARDANDO_COORDENACAO",
            tipo: "TRANSFERENCIA_EXTERNA",
            cursoId: "adm",
            restanteMin: 180,
            analistaId: ANALISTAS[0].id,
            roteiro: "COORDENACAO_2",
         },
         agora,
      ),
      criarCaso(
         -3,
         {
            id: "c-demo-ajuste",
            etapa: "AJUSTE_POS_COORDENACAO",
            tipo: "PORTADOR_DIPLOMA",
            cursoId: "adm",
            restanteMin: 150,
            analistaId: ANALISTAS[0].id,
            roteiro: "AJUSTE",
         },
         agora,
      ),
      criarCaso(
         -4,
         {
            id: "c-demo-matricula",
            etapa: "PRONTO_PARA_MATRICULA",
            tipo: "TRANSFERENCIA_EXTERNA",
            cursoId: "psi",
            restanteMin: 40,
            matriculaId: MATRICULA[0].id,
            roteiro: "MATRICULA",
         },
         agora,
      ),
      criarCaso(
         -5,
         {
            id: "c-demo-negociacao",
            etapa: "EM_NEGOCIACAO",
            tipo: "PORTADOR_DIPLOMA",
            cursoId: "dir",
            restanteMin: 60,
            matriculaId: MATRICULA[0].id,
            roteiro: "NEGOCIACAO",
         },
         agora,
      ),
      criarCaso(
         -6,
         {
            id: "c-demo-documentos",
            etapa: "AGUARDANDO_DOCUMENTOS",
            tipo: "TRANSFERENCIA_EXTERNA",
            cursoId: "cc",
            alvo: "NO_PRAZO",
            consultorId: CONSULTORES[0].id,
            roteiro: "DOCUMENTOS_1",
         },
         agora,
      ),
   ];
}

export function semearCasos(agora: Date): CasoRegistro[] {
   const t = agora.getTime();
   const r = criarPrng("distribuicao-casos");
   const casos: CasoRegistro[] = roteiros(t);
   let n = 0;
   for (const [etapa, qtd] of DISTRIBUICAO) {
      for (let i = 0; i < qtd; i++) {
         n++;
         // Alguns casos na fila sem responsável, para o "Pegar próximo" ter o que pegar.
         const semAnalista = etapa === "EM_ANALISE" && i < 5;
         const semMatricula = etapa === "PRONTO_PARA_MATRICULA" && i < 4;
         const consultorPersona =
            (etapa === "AGUARDANDO_DOCUMENTOS" || etapa === "RASCUNHO" || etapa === "PROPOSTA_ENVIADA") && r.chance(0.22);
         casos.push(
            criarCaso(
               n,
               {
                  etapa,
                  analistaId: semAnalista ? null : undefined,
                  matriculaId: semMatricula ? null : undefined,
                  consultorId: consultorPersona || etapa === "RASCUNHO" ? CONSULTORES[0].id : undefined,
               },
               t,
            ),
         );
      }
   }
   for (const [etapa, qtd] of DISTRIBUICAO_APROVEITAMENTO) {
      for (let i = 0; i < qtd; i++) {
         n++;
         casos.push(criarCaso(n, { etapa, tipo: "APROVEITAMENTO_ESTUDOS" }, t));
      }
   }
   const principal = casos.find(c => c.id === "c-demo-analise");
   const segundo = casos.find(c => c.id === "c-demo-coordenacao");
   if (principal && segundo) {
      segundo.candidato = { ...principal.candidato };
      principal.candidato.ra = "202600842";
      segundo.candidato.ra = principal.candidato.ra;
      principal.matriculado = true;
      segundo.matriculado = true;
   }
   // Um caso de teste cancelado (fora dos indicadores).
   const teste = casos.find(c => c.etapa === "CANCELADO" && c.motivoEncerramento === "TESTE");
   if (teste) teste.teste = true;
   return casos;
}
