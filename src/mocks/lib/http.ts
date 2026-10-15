/**
 * Respostas simuladas no envelope do contrato: `{ success, data }` e `ApiErrorResponse`. A latência
 * é determinística (150 a 600 ms) para exercitar skeletons sem tornar a demonstração imprevisível.
 */
import { delay, HttpResponse } from "msw";

import { env } from "@/config/env";

import { criarPrng } from "@/mocks/lib/prng";

/** Prefixo das rotas: o mesmo `VITE_API_URL` que o Axios usa. */
export const API = env.apiUrl.replace(/\/+$/, "");

const latencias = criarPrng("latencia");

export async function latencia(): Promise<void> {
   await delay(latencias.int(150, 600));
}

export function ok<T>(data: T, status = 200) {
   return HttpResponse.json({ success: true, data }, { status });
}

export function vazio(status = 204) {
   return new HttpResponse(null, { status });
}

export function erro(
   status: number,
   code: string,
   message: string,
   extra: { detalhes?: string[]; atualizadoPor?: { id: string; nome: string } } = {},
) {
   return HttpResponse.json({ success: false, error: { code, message, ...extra } }, { status });
}

/** Lê `If-Match` (versão do caso) do pedido. */
export function versaoPedida(request: Request): number | null {
   const v = request.headers.get("If-Match");
   return v === null ? null : Number(v);
}
