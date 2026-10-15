/**
 * Gerador pseudoaleatório com semente (mulberry32). Dado de demonstração é DETERMINÍSTICO
 * (DS §11, regra 5): a mesma entidade mostra o mesmo valor em todo render e toda sessão. Nunca
 * `Math.random`.
 */

export interface Prng {
   /** [0, 1) */
   next(): number;
   /** Inteiro em [min, max]. */
   int(min: number, max: number): number;
   chance(p: number): boolean;
   pick<T>(lista: readonly T[]): T;
   /** Escolhe por peso: [[valor, peso], ...]. */
   weighted<T>(itens: readonly (readonly [T, number])[]): T;
   shuffle<T>(lista: readonly T[]): T[];
}

/** Hash FNV-1a de 32 bits: transforma qualquer texto numa semente estável. */
export function hash(texto: string): number {
   let h = 0x811c9dc5;
   for (let i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
   }
   return h >>> 0;
}

export function criarPrng(semente: number | string): Prng {
   let a = typeof semente === "string" ? hash(semente) : semente >>> 0;
   const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
   };
   const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
   return {
      next,
      int,
      chance: p => next() < p,
      pick: lista => lista[Math.floor(next() * lista.length)],
      weighted: itens => {
         const total = itens.reduce((s, [, p]) => s + p, 0);
         let r = next() * total;
         for (const [v, p] of itens) {
            r -= p;
            if (r < 0) return v;
         }
         return itens[itens.length - 1][0];
      },
      shuffle: lista => {
         const copia = [...lista];
         for (let i = copia.length - 1; i > 0; i--) {
            const j = Math.floor(next() * (i + 1));
            [copia[i], copia[j]] = [copia[j], copia[i]];
         }
         return copia;
      },
   };
}
