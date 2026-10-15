/**
 * Ordem padrão da fila e regra do "Pegar próximo" (docs/03 §7):
 * estourado → atenção → ouvidoria/escalado → mais antigo na etapa.
 */
import type { CasoResumo } from "@/features/casos/types/caso.schema";
import { lerSla } from "@/features/casos/domain/sla";

function faixa(c: CasoResumo, agora: Date): number {
   const { estado } = lerSla(c.sla, agora);
   if (estado === "ESTOURADO") return 0;
   if (estado === "ATENCAO") return 1;
   if (c.flags.ouvidoria || c.flags.escalado) return 2;
   if (estado === "PAUSADO") return 4;
   return 3;
}

export function compararPrioridade(agora: Date) {
   return (a: CasoResumo, b: CasoResumo): number => {
      const fa = faixa(a, agora);
      const fb = faixa(b, agora);
      if (fa !== fb) return fa - fb;
      const va = a.sla.venceEm ? Date.parse(a.sla.venceEm) : Number.POSITIVE_INFINITY;
      const vb = b.sla.venceEm ? Date.parse(b.sla.venceEm) : Number.POSITIVE_INFINITY;
      if (va !== vb) return va - vb;
      return Date.parse(a.etapaDesde) - Date.parse(b.etapaDesde);
   };
}

/** Próximo caso para "Pegar próximo": o de maior prioridade sem responsável nas etapas do papel. */
export function proximoCaso(casos: readonly CasoResumo[], etapas: readonly CasoResumo["etapa"][], agora: Date): CasoResumo | null {
   const candidatos = casos.filter(c => c.responsavel === null && etapas.includes(c.etapa));
   return [...candidatos].sort(compararPrioridade(agora))[0] ?? null;
}
