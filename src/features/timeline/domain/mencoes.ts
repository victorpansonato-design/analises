/**
 * @menção nas notas internas (docs/05 §3.4: menção notifica). Puro e testado.
 *
 * - O autocomplete insere o nome completo (`@Juliana Prado`), que não é ambíguo.
 * - `@Juliana` sozinho também vale quando só uma pessoa tem esse primeiro nome (é como a equipe
 *   escreve à mão). Com dois "Fábio", só o nome completo menciona.
 * - Comparação sem acento e sem caixa; a menção termina onde termina o nome (`@Juliana,` vale).
 */
import { searchKey } from "@/lib/format";

export interface PessoaMencionavel {
   id: string;
   nome: string;
}

const LETRA = /[\p{L}\p{N}]/u;

function primeiro(nome: string): string {
   return nome.trim().split(/\s+/)[0] ?? "";
}

/** Alternativas que mencionam cada pessoa: nome completo e, se único, o primeiro nome. */
function alvos(pessoas: readonly PessoaMencionavel[]): { chave: string; id: string }[] {
   const contagem = new Map<string, number>();
   for (const p of pessoas) contagem.set(searchKey(primeiro(p.nome)), (contagem.get(searchKey(primeiro(p.nome))) ?? 0) + 1);
   const lista: { chave: string; id: string }[] = [];
   for (const p of pessoas) {
      lista.push({ chave: searchKey(p.nome), id: p.id });
      const curto = searchKey(primeiro(p.nome));
      if (contagem.get(curto) === 1 && curto !== searchKey(p.nome)) lista.push({ chave: curto, id: p.id });
   }
   // O mais longo primeiro: "@Juliana Prado" não pode ser lido como "@Juliana".
   return lista.sort((a, b) => b.chave.length - a.chave.length);
}

interface Ocorrencia {
   inicio: number;
   fim: number;
   id: string;
}

/** Ocorrências de @menção no texto, sem sobreposição. */
function ocorrencias(texto: string, pessoas: readonly PessoaMencionavel[]): Ocorrencia[] {
   const chaves = alvos(pessoas);
   const achadas: Ocorrencia[] = [];
   for (let i = 0; i < texto.length; i++) {
      if (texto[i] !== "@") continue;
      if (i > 0 && LETRA.test(texto[i - 1])) continue; // e-mail, não menção
      const resto = searchKey(texto.slice(i + 1, i + 1 + 80));
      const alvo = chaves.find(c => resto.startsWith(c.chave) && !LETRA.test(resto.charAt(c.chave.length)));
      if (!alvo) continue;
      const fim = i + 1 + comprimentoOriginal(texto.slice(i + 1), alvo.chave.length);
      achadas.push({ inicio: i, fim, id: alvo.id });
      i = fim - 1;
   }
   return achadas;
}

/** Quantos caracteres do original correspondem a `n` caracteres normalizados. */
function comprimentoOriginal(original: string, n: number): number {
   let usados = 0;
   let i = 0;
   while (i < original.length && usados < n) {
      usados += searchKey(original[i]).length || (original[i] === " " ? 1 : 0);
      i++;
   }
   return i;
}

/** Ids mencionados, sem repetição, na ordem em que aparecem. */
export function extrairMencoes(texto: string, pessoas: readonly PessoaMencionavel[]): string[] {
   return [...new Set(ocorrencias(texto, pessoas).map(o => o.id))];
}

export interface TrechoNota {
   texto: string;
   mencao: boolean;
}

/** Quebra o texto da nota para destacar as menções. */
export function segmentarMencoes(texto: string, pessoas: readonly PessoaMencionavel[]): TrechoNota[] {
   const trechos: TrechoNota[] = [];
   let ultimo = 0;
   for (const o of ocorrencias(texto, pessoas)) {
      if (o.inicio > ultimo) trechos.push({ texto: texto.slice(ultimo, o.inicio), mencao: false });
      trechos.push({ texto: texto.slice(o.inicio, o.fim), mencao: true });
      ultimo = o.fim;
   }
   if (ultimo < texto.length) trechos.push({ texto: texto.slice(ultimo), mencao: false });
   return trechos;
}

/** Menção sendo digitada no cursor: `@jul|` → `{ inicio: posição do @, termo: "jul" }`. */
export function consultaMencao(textoAteCursor: string): { inicio: number; termo: string } | null {
   const m = /(^|\s)@([\p{L}]{0,30})$/u.exec(textoAteCursor);
   if (!m) return null;
   return { inicio: textoAteCursor.length - m[2].length - 1, termo: m[2] };
}

/** Sugestões para o termo: começa pelo primeiro nome ou por qualquer sobrenome. */
export function sugerirPessoas<T extends PessoaMencionavel>(pessoas: readonly T[], termo: string, limite = 6): T[] {
   const t = searchKey(termo);
   return pessoas
      .filter(p =>
         searchKey(p.nome)
            .split(/\s+/)
            .some(parte => parte.startsWith(t)),
      )
      .slice(0, limite);
}

/** Troca o `@termo` em digitação pela menção completa e devolve onde o cursor deve ficar. */
export function inserirMencao(texto: string, inicio: number, cursor: number, pessoa: PessoaMencionavel): { texto: string; cursor: number } {
   const mencao = `@${pessoa.nome} `;
   const depois = texto.slice(cursor).replace(/^\s+/, "");
   return { texto: `${texto.slice(0, inicio)}${mencao}${depois}`, cursor: inicio + mencao.length };
}
