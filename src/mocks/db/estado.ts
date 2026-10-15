/**
 * Estado do backend simulado, em memória. Recarregar a página volta à semente (determinística):
 * o mesmo link de caso abre o mesmo caso em qualquer aba e para qualquer papel.
 */
import type { EstadoDb } from "@/mocks/db/tipos";

export const db: EstadoDb = {
   iniciadoEm: new Date(),
   casos: new Map(),
   analises: new Map(),
   analisesArquivadas: new Map(),
   documentos: new Map(),
   eventos: new Map(),
   notificacoes: new Map(),
   metas: new Map(),
   sequencia: 1,
};

export function novoId(prefixo: string): string {
   db.sequencia += 1;
   return `${prefixo}-${db.sequencia.toString(36)}`;
}

export function agora(): Date {
   return new Date();
}
