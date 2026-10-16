/**
 * Simulação visual da página do aluno: a sequência de momentos que o aluno pode ver, do primeiro
 * passo à matrícula. Serve só para demonstrar a tela (com `VITE_USE_MOCKS=true`): não chama a API e
 * não muda nada na análise. Puro: a página escolhe o momento e desenha.
 */
import type { AcompanhamentoPublico, PassoPublico } from "@/features/acompanhamento/types/acompanhamento.schema";

/** Passos em que a vez pode ser do aluno: viram dois momentos (equipe trabalhando → aguardando o aluno). */
const COM_VEZ_DO_ALUNO: Partial<Record<PassoPublico, readonly boolean[]>> = {
   DOCUMENTOS: [true],
   PROPOSTA: [false, true],
};

export function momentosSimulados(d: AcompanhamentoPublico, agora: string): AcompanhamentoPublico[] {
   const n = d.passos.length;
   const emReal = (i: number) => d.passos[i]?.em ?? null;
   const momentos: AcompanhamentoPublico[] = [];
   // O primeiro passo (pedido recebido) já nasce feito; o último é o próprio desfecho.
   for (let i = 1; i < n - 1; i++) {
      const passo = d.passos[i].passo;
      for (const aguardandoAluno of COM_VEZ_DO_ALUNO[passo] ?? [false]) {
         momentos.push({
            ...d,
            situacao: "EM_ANDAMENTO",
            aguardandoAluno,
            ra: null,
            atualizadoEm: agora,
            passos: d.passos.map((p, j) => ({
               passo: p.passo,
               estado: j < i ? "FEITO" : j === i ? "ATUAL" : "PROXIMO",
               em: j < i ? (p.estado === "FEITO" ? emReal(j) : agora) : j === i ? (p.estado === "ATUAL" ? emReal(j) : agora) : null,
            })),
         });
      }
   }
   const temMatricula = d.passos.some(p => p.passo === "MATRICULA");
   momentos.push({
      ...d,
      situacao: temMatricula ? "MATRICULADO" : "CONCLUIDO",
      aguardandoAluno: false,
      // RA inventado só para a demonstração, quando o caso ainda não tem um.
      ra: temMatricula ? (d.ra ?? `2027${d.protocolo}`) : null,
      atualizadoEm: agora,
      passos: d.passos.map(p => ({ passo: p.passo, estado: "FEITO", em: p.estado === "FEITO" ? p.em : agora })),
   });
   return momentos;
}

/** Em qual momento da simulação o caso real está (para "Avançar" partir de onde ele está de verdade). */
export function momentoReal(d: AcompanhamentoPublico, momentos: readonly AcompanhamentoPublico[]): number {
   if (d.situacao === "MATRICULADO" || d.situacao === "CONCLUIDO") return momentos.length - 1;
   const atual = d.passos.find(p => p.estado === "ATUAL" || p.estado === "INTERROMPIDO")?.passo;
   const i = momentos.findIndex(m => m.passos.find(p => p.estado === "ATUAL")?.passo === atual && m.aguardandoAluno === d.aguardandoAluno);
   if (i >= 0) return i;
   const mesmoPasso = momentos.findIndex(m => m.passos.find(p => p.estado === "ATUAL")?.passo === atual);
   return Math.max(0, mesmoPasso);
}
