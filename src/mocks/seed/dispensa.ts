/** Base própria do módulo; nenhum aluno, protocolo ou resultado de Análises é consultado. */
import type { AlunoDispensa, GradeDispensa, MensalidadeDispensa } from "@/features/calculo-dispensa";

const cursos = [
   {
      curso: "Administração",
      curriculo: "ADM-2026",
      contrato: 200000,
      nomes: [
         "Bases da administração moderna",
         "Bases da contabilidade",
         "Comunicação escrita",
         "Economia empresarial",
         "Lógica empresarial",
         "Tecnologia e negócios",
      ],
   },
   {
      curso: "Ciências Contábeis",
      curriculo: "CON-2026",
      contrato: 180000,
      nomes: [
         "Fundamentos da contabilidade",
         "Matemática financeira",
         "Comunicação escrita",
         "Economia empresarial",
         "Direito empresarial",
         "Contabilidade digital",
      ],
   },
   {
      curso: "Direito",
      curriculo: "DIR-2026",
      contrato: 240000,
      nomes: [
         "Teoria geral do direito",
         "Direito constitucional",
         "Comunicação jurídica",
         "Ciência política",
         "Direito civil",
         "História do direito",
      ],
   },
];

export const gradesDispensa: GradeDispensa[] = cursos.flatMap((c, curso) =>
   [2025, 2026].flatMap(ano =>
      [1, 2].flatMap(semestre =>
         ["Noturno", "Matutino"].flatMap(turno =>
            [1, 2].map(serie => ({
               id: `${curso}-${ano}-${semestre}-${turno}-${serie}`,
               ano,
               periodo: `${ano}/${semestre}`,
               curso: c.curso,
               curriculo: c.curriculo.replace("2026", String(ano)),
               turno,
               serie,
               contrato: ano === 2026 ? c.contrato : Math.round(c.contrato * 0.95),
               disciplinas: c.nomes.map((nome, i) => ({
                  id: `d${i + 1}`,
                  nome: serie === 1 ? `${nome} I` : nome,
                  creditos: [40, 60, 60, 60, 40, 40][i],
               })),
            })),
         ),
      ),
   ),
);

function mensalidades(semestre: number, valores: number[]): MensalidadeDispensa[] {
   return valores.map((valor, i) => {
      const mes = String(i + (semestre === 2 ? 7 : 1)).padStart(2, "0");
      return {
         id: `2026-${mes}`,
         competencia: `2026-${mes}`,
         vencimento: `2026-${mes}-12`,
         valor,
         pagamento: i < 3 ? "Pago" : "Em aberto",
         condicao: "regular",
      };
   });
}

export const alunosDispensa: AlunoDispensa[] = [
   {
      ra: "2026001",
      nome: "Clara Martins Oliveira",
      vinculos: [
         {
            gradeId: "0-2026-2-Noturno-2",
            dispensadas: ["d3", "d4"],
            descontos: { perfil: "normal", bolsa: 50, fixo: 0, antecipado1: 10, antecipado2: 5 },
            mensalidades: mensalidades(2, [60000, 75000, 60000, 75000, 55000, 60000]),
         },
         {
            gradeId: "0-2026-1-Noturno-1",
            dispensadas: [],
            descontos: { perfil: "normal", bolsa: 50, fixo: 0, antecipado1: 10, antecipado2: 5 },
            mensalidades: mensalidades(1, [100000, 100000, 100000, 100000, 100000, 100000]),
         },
      ],
   },
   {
      ra: "2026002",
      nome: "Rafael Costa Almeida",
      vinculos: [
         {
            gradeId: "1-2026-2-Noturno-2",
            dispensadas: ["d3", "d4"],
            descontos: { perfil: "normal", bolsa: 40, fixo: 0, antecipado1: 0, antecipado2: 0 },
            mensalidades: mensalidades(2, [64800, 64800, 64800, 64800, 64800, 64800]),
         },
      ],
   },
];
