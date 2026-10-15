/**
 * Matemática dos gráficos (DS §11): ticks redondos e rótulos ralos. Puro e testado.
 *
 * - `niceScale`: passo normalizado para 1 / 2 / 2,5 / 5 / 10 × 10ⁿ. Um eixo que termina em 3.678
 *   obriga a ler cada rótulo; em 4.000, a posição já diz o valor.
 * - `thin`: anda de trás para frente a partir do último ponto ("hoje", o rótulo que não pode faltar)
 *   e troca o índice mais baixo pelo primeiro. Andar para a frente deixava rótulos colados no fim.
 */

export interface Escala {
   min: number;
   max: number;
   passo: number;
   ticks: number[];
}

const limpar = (n: number) => Number(n.toFixed(10));

/** Passo "redondo" mais próximo (para cima) de um passo bruto. */
export function passoRedondo(bruto: number): number {
   if (!Number.isFinite(bruto) || bruto <= 0) return 1;
   const expoente = Math.floor(Math.log10(bruto));
   const base = 10 ** expoente;
   const f = bruto / base;
   const redondo = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
   return limpar(redondo * base);
}

/** Escala com ticks redondos que contém [min, max]. `alvo` é o número aproximado de intervalos. */
export function niceScale(min: number, max: number, alvo = 4): Escala {
   let lo = Math.min(min, max);
   let hi = Math.max(min, max);
   if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = 0;
      hi = 1;
   }
   if (hi === lo) hi = lo === 0 ? 1 : lo + Math.abs(lo);
   const passo = passoRedondo((hi - lo) / Math.max(1, alvo));
   const inicio = limpar(Math.floor(lo / passo) * passo);
   const fim = limpar(Math.ceil(hi / passo) * passo);
   const ticks: number[] = [];
   for (let v = inicio, i = 0; v <= fim + passo / 1e6 && i < 100; i++, v = limpar(inicio + i * passo)) ticks.push(v);
   return { min: inicio, max: fim, passo, ticks };
}

/** Índices que recebem rótulo (crescentes). O último índice sempre entra; o primeiro também. */
export function thin(total: number, maxRotulos: number): number[] {
   if (total <= 0) return [];
   const limite = Math.max(1, Math.floor(maxRotulos));
   if (total <= limite) return Array.from({ length: total }, (_, i) => i);
   if (limite === 1) return [total - 1];
   const passo = Math.ceil((total - 1) / (limite - 1));
   const indices: number[] = [];
   for (let i = total - 1; i >= 0; i -= passo) indices.push(i);
   indices[indices.length - 1] = 0;
   return [...new Set(indices)].sort((a, b) => a - b);
}
