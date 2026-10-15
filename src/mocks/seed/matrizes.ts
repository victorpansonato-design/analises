/**
 * Matrizes curriculares FICTÍCIAS para a tela "Matriz Curricular". Reaproveita os nomes de
 * disciplinas de `cursos.ts` para ficar crível e gera tudo de forma determinística: códigos de
 * disciplina pelo prefixo do curso + período + posição (ADM0101), grupos por prefixo + sigla do
 * grupo (ADMES01) e CH por posição. Nada aqui é a grade real da UniAnchieta.
 *
 * Variações de propósito: nem todo curso tem todas as modalidades, alguns currículos não têm TCC
 * em grupo (o TCC fica seriado), outros não têm eletivas e um não tem grupo nenhum.
 */
import {
   codigoDoCurso,
   somaCh,
   type Curriculo,
   type DisciplinaCurriculo,
   type DisciplinaSeriada,
   type GrupoDisciplinas,
   type ModalidadeMatriz,
   type TipoGrupo,
   type TurnoMatriz,
} from "@/features/matriz-curricular";

import { cursoPorId } from "@/mocks/seed/cursos";

interface DefCurriculo {
   ano: number;
   semestre: 1 | 2;
   turno?: TurnoMatriz;
   ativo: boolean;
   grupos: TipoGrupo[];
}

interface DefOferta {
   modalidade: ModalidadeMatriz;
   curriculos: DefCurriculo[];
}

interface DefCurso {
   cursoId: string;
   /** Código base do curso (o presencial). */
   base: number;
   prefixo: string;
   eletivas: string[];
   ofertas: DefOferta[];
}

const TODOS: TipoGrupo[] = ["ESTAGIO", "ELETIVAS", "TCC", "EXTENSAO"];

const DEFINICOES: readonly DefCurso[] = [
   {
      cursoId: "adm",
      base: 8,
      prefixo: "ADM",
      eletivas: [
         "Gestão de startups",
         "Marketing digital",
         "Gestão de franquias",
         "Inteligência de mercado",
         "Gestão do agronegócio",
         "Libras",
      ],
      ofertas: [
         {
            modalidade: "PRESENCIAL",
            curriculos: [
               { ano: 2026, semestre: 1, turno: "DIURNO", ativo: true, grupos: TODOS },
               { ano: 2026, semestre: 1, turno: "NOTURNO", ativo: true, grupos: TODOS },
               { ano: 2022, semestre: 1, turno: "NOTURNO", ativo: false, grupos: ["ESTAGIO", "TCC"] },
            ],
         },
         { modalidade: "HIBRIDO", curriculos: [{ ano: 2025, semestre: 1, ativo: true, grupos: TODOS }] },
         {
            modalidade: "EAD",
            curriculos: [
               { ano: 2026, semestre: 1, ativo: true, grupos: ["ESTAGIO", "ELETIVAS", "EXTENSAO"] },
               { ano: 2024, semestre: 1, ativo: true, grupos: ["ESTAGIO", "EXTENSAO"] },
               { ano: 2020, semestre: 1, ativo: false, grupos: ["ESTAGIO"] },
            ],
         },
      ],
   },
   {
      cursoId: "cont",
      base: 9,
      prefixo: "CCO",
      eletivas: ["Contabilidade rural", "Contabilidade ambiental", "Gestão de tributos municipais", "Análise de crédito", "Libras"],
      ofertas: [
         {
            modalidade: "PRESENCIAL",
            curriculos: [{ ano: 2025, semestre: 2, turno: "NOTURNO", ativo: true, grupos: ["ESTAGIO", "TCC", "EXTENSAO"] }],
         },
         { modalidade: "HIBRIDO", curriculos: [{ ano: 2026, semestre: 1, ativo: true, grupos: ["ESTAGIO", "ELETIVAS", "EXTENSAO"] }] },
         {
            modalidade: "EAD",
            curriculos: [
               { ano: 2026, semestre: 1, ativo: true, grupos: ["ESTAGIO", "EXTENSAO"] },
               { ano: 2023, semestre: 1, ativo: false, grupos: ["ESTAGIO"] },
            ],
         },
      ],
   },
   {
      cursoId: "dir",
      base: 12,
      prefixo: "DIR",
      eletivas: ["Direito eleitoral", "Direito agrário", "Direito desportivo", "Direito da saúde", "Direito urbanístico", "Libras"],
      ofertas: [
         {
            modalidade: "PRESENCIAL",
            curriculos: [
               { ano: 2026, semestre: 1, turno: "DIURNO", ativo: true, grupos: TODOS },
               { ano: 2026, semestre: 1, turno: "NOTURNO", ativo: true, grupos: TODOS },
               { ano: 2024, semestre: 1, turno: "NOTURNO", ativo: true, grupos: ["ESTAGIO", "TCC"] },
               { ano: 2019, semestre: 1, turno: "DIURNO", ativo: false, grupos: ["ESTAGIO"] },
            ],
         },
      ],
   },
   {
      cursoId: "ped",
      base: 15,
      prefixo: "PED",
      eletivas: [
         "Educação no campo",
         "Gestão de projetos educacionais",
         "Educação a distância",
         "Pedagogia hospitalar",
         "Educação e mídias",
      ],
      ofertas: [
         {
            modalidade: "PRESENCIAL",
            curriculos: [{ ano: 2025, semestre: 1, turno: "NOTURNO", ativo: true, grupos: ["ESTAGIO", "TCC", "EXTENSAO"] }],
         },
         {
            modalidade: "EAD",
            curriculos: [
               { ano: 2026, semestre: 1, ativo: true, grupos: ["ESTAGIO", "ELETIVAS", "EXTENSAO"] },
               { ano: 2024, semestre: 2, ativo: true, grupos: ["ESTAGIO", "EXTENSAO"] },
            ],
         },
      ],
   },
   {
      cursoId: "eng",
      base: 21,
      prefixo: "ECV",
      eletivas: ["Conforto ambiental", "Construções sustentáveis", "BIM aplicado a projetos", "Engenharia de avaliações", "Libras"],
      ofertas: [
         {
            modalidade: "PRESENCIAL",
            curriculos: [
               { ano: 2026, semestre: 1, turno: "NOTURNO", ativo: true, grupos: TODOS },
               { ano: 2023, semestre: 1, turno: "DIURNO", ativo: false, grupos: ["ESTAGIO", "TCC"] },
            ],
         },
      ],
   },
   {
      cursoId: "psi",
      base: 33,
      prefixo: "PSI",
      eletivas: ["Psicologia do esporte", "Psicologia do trânsito", "Psicologia e tecnologia", "Psicologia ambiental", "Libras"],
      ofertas: [
         {
            modalidade: "PRESENCIAL",
            // Estágios da Psicologia são seriados (estão nos períodos), por isso não há grupo de estágio.
            curriculos: [
               { ano: 2026, semestre: 1, turno: "DIURNO", ativo: true, grupos: ["ELETIVAS", "TCC", "EXTENSAO"] },
               { ano: 2026, semestre: 1, turno: "NOTURNO", ativo: true, grupos: ["ELETIVAS", "TCC", "EXTENSAO"] },
            ],
         },
      ],
   },
   {
      cursoId: "cc",
      base: 41,
      prefixo: "CCP",
      eletivas: [
         "Ciência de dados",
         "Desenvolvimento de jogos",
         "Internet das coisas",
         "Blockchain e aplicações",
         "Visão computacional",
         "Libras",
      ],
      ofertas: [
         { modalidade: "PRESENCIAL", curriculos: [{ ano: 2026, semestre: 1, turno: "NOTURNO", ativo: true, grupos: TODOS }] },
         { modalidade: "EAD", curriculos: [{ ano: 2025, semestre: 1, ativo: true, grupos: ["ELETIVAS", "EXTENSAO"] }] },
      ],
   },
   {
      cursoId: "enf",
      base: 47,
      prefixo: "ENF",
      eletivas: [],
      ofertas: [
         {
            modalidade: "PRESENCIAL",
            // Currículo todo seriado: estágio, TCC e extensão estão dentro dos períodos.
            curriculos: [
               { ano: 2025, semestre: 1, turno: "DIURNO", ativo: true, grupos: [] },
               { ano: 2021, semestre: 1, turno: "DIURNO", ativo: false, grupos: [] },
            ],
         },
      ],
   },
];

const CH_PADRAO = [60, 60, 80, 40, 60, 80] as const;
const SIGLA_GRUPO: Record<TipoGrupo, string> = { ESTAGIO: "ES", ELETIVAS: "EL", TCC: "TC", EXTENSAO: "PX" };
const SUFIXO_CURRICULO: Record<ModalidadeMatriz, string> = { PRESENCIAL: "", HIBRIDO: "H", EAD: "EAD" };
const ROMANOS = ["I", "II", "III", "IV", "V", "VI"] as const;
const doisDigitos = (n: number) => String(n).padStart(2, "0");
const ehTcc = (nome: string) => /^Trabalho de conclusão/.test(nome);

function disciplinaDeGrupo(prefixo: string, tipo: TipoGrupo, i: number, nome: string, ch: number): DisciplinaCurriculo {
   return { codigo: `${prefixo}${SIGLA_GRUPO[tipo]}${doisDigitos(i + 1)}`, nome, ch };
}

/** Divide a CH de extensão em quatro práticas, com resto na última e múltiplos de 10. */
function praticasExtensionistas(prefixo: string, total: number): DisciplinaCurriculo[] {
   const parte = Math.floor(total / 4 / 10) * 10;
   return ROMANOS.slice(0, 4).map((r, i) =>
      disciplinaDeGrupo(prefixo, "EXTENSAO", i, `Prática extensionista ${r}`, i === 3 ? total - parte * 3 : parte),
   );
}

function montarCurriculo(def: DefCurso, oferta: DefOferta, c: DefCurriculo): Curriculo {
   const curso = cursoPorId(def.cursoId);
   const indiceModalidade = ["PRESENCIAL", "HIBRIDO", "EAD"].indexOf(oferta.modalidade);
   const antigo = c.ano < 2025;
   const temTccEmGrupo = c.grupos.includes("TCC");
   const disciplinas: DisciplinaSeriada[] = [];
   const tccs: string[] = [];

   curso.grade.forEach((nomes, i) => {
      // Currículos antigos tinham uma disciplina a menos no 3º e no 6º período.
      const doPeriodo = antigo && (i === 2 || i === 5) && nomes.length > 4 ? nomes.slice(0, -1) : nomes;
      let posicao = 0;
      doPeriodo.forEach((nome, j) => {
         if (temTccEmGrupo && ehTcc(nome)) {
            tccs.push(nome);
            return;
         }
         posicao += 1;
         disciplinas.push({
            codigo: `${def.prefixo}${doisDigitos(i + 1)}${doisDigitos(posicao)}`,
            nome,
            ch: CH_PADRAO[(i + j + indiceModalidade) % CH_PADRAO.length],
            periodo: i + 1,
         });
      });
   });

   const extensao = curso.praticaExtensionistaExigida - (antigo ? 40 : 0);
   const grupos: GrupoDisciplinas[] = [];
   for (const tipo of c.grupos) {
      const id = tipo.toLowerCase();
      if (tipo === "ESTAGIO") {
         const ch = curso.periodos >= 10 ? 200 : 160;
         grupos.push({
            id,
            tipo,
            aPartirDoPeriodo: curso.periodos - 3,
            chExigida: null,
            disciplinas: ["Estágio obrigatório I", "Estágio obrigatório II"].map((nome, i) =>
               disciplinaDeGrupo(def.prefixo, tipo, i, nome, ch),
            ),
         });
      } else if (tipo === "ELETIVAS" && def.eletivas.length) {
         const opcoes = def.eletivas.map((nome, i) => disciplinaDeGrupo(def.prefixo, tipo, i, nome, 40));
         grupos.push({ id, tipo, aPartirDoPeriodo: 3, chExigida: Math.min(160, (opcoes.length - 2) * 40), disciplinas: opcoes });
      } else if (tipo === "TCC" && tccs.length) {
         grupos.push({
            id,
            tipo,
            aPartirDoPeriodo: curso.periodos - 1,
            chExigida: null,
            disciplinas: tccs.map((nome, i) => disciplinaDeGrupo(def.prefixo, tipo, i, nome, 80)),
         });
      } else if (tipo === "EXTENSAO") {
         grupos.push({
            id,
            tipo,
            aPartirDoPeriodo: oferta.modalidade === "PRESENCIAL" ? 2 : null,
            chExigida: null,
            disciplinas: praticasExtensionistas(def.prefixo, extensao),
         });
      }
   }

   const eletivas = grupos.find(g => g.tipo === "ELETIVAS")?.chExigida ?? 0;
   const complementares = curso.atividadesComplementaresExigidas - (oferta.modalidade === "EAD" ? 40 : 0);
   // [VALIDAR] composição da CH total: seriadas + grupos (eletivas pela CH exigida) + complementares.
   // Sem grupo de extensão, a extensão está curricularizada nas disciplinas e não soma de novo.
   const chGrupos = grupos.reduce((soma, g) => soma + (g.chExigida ?? somaCh(g.disciplinas)), 0);
   const turno = oferta.modalidade === "PRESENCIAL" ? (c.turno ?? null) : null;
   const sufixo = turno ? turno.charAt(0) : SUFIXO_CURRICULO[oferta.modalidade];
   const codigo = `${def.prefixo}-${c.ano}-${c.semestre}-${sufixo}`;

   return {
      id: codigo.toLowerCase(),
      codigo,
      rotulo: `Matriz ${c.ano}.${c.semestre}`,
      turno,
      vigenciaInicio: `${c.ano}-${c.semestre === 1 ? "02" : "08"}-01`,
      ativo: c.ativo,
      chTotal: somaCh(disciplinas) + chGrupos + complementares,
      totalDisciplinas: disciplinas.length + grupos.reduce((soma, g) => soma + g.disciplinas.length, 0),
      oferta: {
         id: `${def.cursoId}-${oferta.modalidade.toLowerCase()}`,
         curso: curso.nome,
         modalidade: oferta.modalidade,
         codigo: codigoDoCurso(def.base, oferta.modalidade),
      },
      periodos: curso.periodos,
      horas: { extensao, complementares, eletivas },
      disciplinas,
      grupos,
   };
}

export interface OfertaSeed {
   id: string;
   curso: string;
   modalidade: ModalidadeMatriz;
   codigo: number;
   curriculos: Curriculo[];
}

export const OFERTAS_MATRIZ: readonly OfertaSeed[] = DEFINICOES.flatMap(def =>
   def.ofertas.map(oferta => {
      const curriculos = oferta.curriculos.map(c => montarCurriculo(def, oferta, c));
      return { ...curriculos[0].oferta, curriculos };
   }),
);

const POR_ID = new Map(OFERTAS_MATRIZ.flatMap(o => o.curriculos.map(c => [c.id, c] as const)));

export function curriculoPorId(id: string): Curriculo | null {
   return POR_ID.get(id) ?? null;
}
