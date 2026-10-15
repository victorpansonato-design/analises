/**
 * Exportação CSV no formato que o Excel em português abre sem configurar nada (DS §12):
 * BOM UTF-8, separador `;` e quebra `\r\n`. O nome do arquivo leva carimbo ordenável.
 */
import { fileStamp } from "@/lib/format";

/** BOM UTF-8: faz o Excel abrir com os acentos certos. */
const BOM = String.fromCharCode(0xfeff);

export type CelulaCsv = string | number | boolean | null | undefined;

function escapar(valor: CelulaCsv): string {
   if (valor === null || valor === undefined) return "";
   const texto = String(valor);
   return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function gerarCsv(cabecalho: readonly string[], linhas: readonly (readonly CelulaCsv[])[]): string {
   const corpo = [cabecalho, ...linhas].map(l => l.map(escapar).join(";")).join("\r\n");
   return `${BOM}${corpo}\r\n`;
}

/** Baixa o CSV no navegador: `prefixo-20260929-1432.csv`. */
export function baixarCsv(prefixo: string, cabecalho: readonly string[], linhas: readonly (readonly CelulaCsv[])[]): void {
   const blob = new Blob([gerarCsv(cabecalho, linhas)], { type: "text/csv;charset=utf-8" });
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = `${prefixo}-${fileStamp()}.csv`;
   document.body.appendChild(a);
   a.click();
   a.remove();
   URL.revokeObjectURL(url);
}
