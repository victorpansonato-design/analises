/**
 * Utilitários dos handlers: localizar o caso, conferir a versão (`If-Match`), checar permissão e
 * registrar a alteração. Todo handler chama `preparar()` antes: é assim que a automação (pré-análise,
 * retomada, sem retorno) acontece "sozinha" enquanto se usa o sistema.
 */
import type { NomeAcao } from "@/features/casos";

import { acoesPara, tick, usuarioAtual } from "@/mocks/db/casos";
import { agora, db } from "@/mocks/db/estado";
import type { CasoRegistro } from "@/mocks/db/tipos";
import { erro, latencia, versaoPedida } from "@/mocks/lib/http";
import { resumoUsuario, type UsuarioMock } from "@/mocks/seed/usuarios";

export interface Contexto {
   agora: Date;
   usuario: UsuarioMock;
}

/** Latência simulada + automação + quem está logado. */
export async function preparar(): Promise<Contexto> {
   await latencia();
   const t = agora();
   tick(t);
   return { agora: t, usuario: usuarioAtual() };
}

export function casoOu404(id: string | readonly string[] | undefined): CasoRegistro | Response {
   const caso = typeof id === "string" ? db.casos.get(id) : undefined;
   return caso ?? erro(404, "NAO_ENCONTRADO", "Caso não encontrado. Confira o link ou busque pelo nome, CPF ou protocolo.");
}

/** 409 quando a versão enviada não é a atual: a interface recarrega e não sobrescreve. */
export function conflitoDeVersao(request: Request, caso: CasoRegistro): Response | null {
   const pedida = versaoPedida(request);
   if (pedida === null || pedida === caso.versao) return null;
   return erro(409, "VERSAO_DESATUALIZADA", "Este caso foi atualizado por outra pessoa.", {
      atualizadoPor: resumoUsuario(caso.ultimoAutorId) ?? { id: "u-sistema", nome: "o sistema" },
   });
}

/** 403 com o motivo pronto quando a ação não está habilitada para quem pediu (o backend é a autoridade). */
export function proibidoSeNaoPuder(caso: CasoRegistro, ctx: Contexto, nome: NomeAcao): Response | null {
   const acao = acoesPara(caso, ctx.usuario, ctx.agora).find(a => a.acao === nome);
   if (acao?.habilitada) return null;
   const motivo = acao?.motivos[0] ?? "Seu perfil não tem acesso a esta ação";
   return erro(403, "PROIBIDO", motivo, { detalhes: acao?.motivos.length ? acao.motivos : [motivo] });
}

/** Marca uma alteração no caso (versão, autor, data). */
export function tocar(caso: CasoRegistro, quem: UsuarioMock | null, t: Date): void {
   caso.versao += 1;
   caso.atualizadoEm = t.toISOString();
   caso.ultimoAutorId = quem?.id ?? null;
}
