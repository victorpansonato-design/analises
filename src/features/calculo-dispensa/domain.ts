import type { DescontosDispensa, GradeDispensa, MensalidadeDispensa } from "./types";

export const moedaDispensa = (centavos: number) =>
   new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);

/** O resíduo do arredondamento fica na última disciplina, conservando o total do contrato. */
export function valoresDisciplinas(grade: GradeDispensa, contrato = grade.contrato): number[] {
   const creditos = grade.disciplinas.reduce((soma, d) => soma + d.creditos, 0);
   if (!creditos) return grade.disciplinas.map(() => 0);
   let distribuido = 0;
   return grade.disciplinas.map((d, i) => {
      const valor = i === grade.disciplinas.length - 1 ? contrato - distribuido : Math.round((contrato * d.creditos) / creditos);
      distribuido += valor;
      return valor;
   });
}

export function calcularDispensa(
   grade: GradeDispensa,
   selecionadas: readonly string[],
   descontos: DescontosDispensa,
   contrato = grade.contrato,
) {
   const valores = valoresDisciplinas(grade, contrato);
   const base = grade.disciplinas.reduce((soma, d, i) => soma + (selecionadas.includes(d.id) ? valores[i] : 0), 0);
   const baseBolsa = descontos.perfil === "prouni50" ? contrato : base;
   const bolsa = Math.round((baseBolsa * descontos.bolsa) / 100);
   const aposBolsa = baseBolsa - bolsa;
   const acrescimoCeu = descontos.perfil === "ceu" ? Math.round(aposBolsa * 0.1) : 0;
   const valorPerfil = descontos.perfil === "normal" ? aposBolsa : Math.round((aposBolsa + acrescimoCeu) / 2);
   const fixo = Math.min(descontos.fixo, valorPerfil);
   const regular = Math.max(0, valorPerfil - fixo);
   return {
      valores,
      base,
      baseBolsa,
      dispensado: contrato - base,
      bolsa,
      aposBolsa,
      acrescimoCeu,
      valorPerfil,
      fixo,
      regular,
      antecipado1: Math.round((regular * (100 - descontos.antecipado1)) / 100),
      antecipado2: Math.round((regular * (100 - descontos.antecipado2)) / 100),
   };
}

export type ResultadoDispensa = ReturnType<typeof calcularDispensa>;

export function conferirMensalidades(mensalidades: MensalidadeDispensa[], resultado: ResultadoDispensa) {
   return mensalidades.map(m => ({ ...m, previsto: resultado[m.condicao], diferenca: m.valor - resultado[m.condicao] }));
}

export const DESCONTOS_VAZIOS: DescontosDispensa = { perfil: "normal", bolsa: 0, fixo: 0, antecipado1: 0, antecipado2: 0 };
