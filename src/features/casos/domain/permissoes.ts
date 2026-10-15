/**
 * Capacidades que NÃO mudam a etapa (as transições estão em caso.machine.ts).
 * Espelha docs/04-papeis-e-permissoes.md. O backend é a autoridade; aqui é para desenhar a UI,
 * explicar bloqueios e fazer os mocks se comportarem como o backend.
 */
import type { Papel } from "@/features/sessao";

import type { Etapa } from "@/features/casos/types/caso.schema";

export const CAPACIDADES = [
   "NOVO_PROTOCOLO",
   "EDITAR_DADOS",
   "SOLICITAR_DOCUMENTO",
   "AVALIAR_DOCUMENTO", // aceitar / recusar
   "REEXECUTAR_PRE_ANALISE",
   "ATRIBUIR",
   "PEGAR_PROXIMO",
   "DECIDIR_ITEM",
   "PERGUNTAR_COORDENACAO",
   "RESPONDER_ITEM_COORDENACAO",
   "CRIAR_EQUIVALENCIA",
   "ENVIAR_MENSAGEM",
   "ADICIONAR_NOTA",
   "MARCAR_OUVIDORIA",
   "ESCALAR",
   "REGISTRAR_PENDENCIA",
   "VER_GESTAO", // indicadores e metas da equipe (decisão de 14/10/2026)
   "VER_INDICADORES_POR_PESSOA",
   "EXPORTAR",
   "REVELAR_CPF",
   "VER_DOCUMENTO_IDENTIDADE",
   "VER_FINANCEIRO",
   "EDITAR_PARAMETROS",
] as const;
export type Capacidade = (typeof CAPACIDADES)[number];

const TODOS: readonly Papel[] = ["CONSULTOR", "ANALISTA", "COORDENADOR", "MATRICULA", "SUPORTE", "DIRETORIA", "GESTAO", "ADMIN"];

/** Gestão comercial: única área restrita (indicadores, rendimento e metas da equipe de vendas). */
const SO_GESTAO: readonly Papel[] = ["GESTAO"];
const RESTRITAS: Partial<Record<Capacidade, readonly Papel[]>> = { VER_GESTAO: SO_GESTAO, VER_INDICADORES_POR_PESSOA: SO_GESTAO };

/** Mesmo acesso para todos (o estado do processo limita as ações), exceto a área de gestão. */
export const MATRIZ = Object.fromEntries(CAPACIDADES.map(cap => [cap, RESTRITAS[cap] ?? TODOS])) as Record<Capacidade, readonly Papel[]>;

/** O usuário tem a capacidade por algum dos seus papéis (sem olhar caso nem etapa). */
export function temCapacidade(papeis: readonly Papel[], cap: Capacidade): boolean {
   return papeis.some(p => MATRIZ[cap].includes(p));
}

/** Restrições de escopo ("○" na matriz). Retorna motivo quando bloqueia. */
export interface EscopoCaso {
   etapa: Etapa;
   responsavelId: string | null;
   consultorId: string | null;
   cursoDestinoId: string;
}
export interface UsuarioPermissao {
   id: string;
   papeis: readonly Papel[];
   cursosCoordenados: readonly string[];
}

export interface ResultadoPermissao {
   pode: boolean;
   motivo?: string;
}

export function pode(_usuario: UsuarioPermissao, cap: Capacidade, caso?: EscopoCaso): ResultadoPermissao {
   if (!caso) return { pode: true };
   const etapas: Partial<Record<Capacidade, readonly Etapa[]>> = {
      DECIDIR_ITEM: ["EM_ANALISE", "AJUSTE_POS_COORDENACAO", "AGUARDANDO_COORDENACAO"],
      PERGUNTAR_COORDENACAO: ["EM_ANALISE", "AJUSTE_POS_COORDENACAO"],
      RESPONDER_ITEM_COORDENACAO: ["AGUARDANDO_COORDENACAO"],
      SOLICITAR_DOCUMENTO: ["RASCUNHO", "AGUARDANDO_DOCUMENTOS", "EM_ANALISE", "AJUSTE_POS_COORDENACAO"],
   };
   const permitidas = etapas[cap];
   return !permitidas || permitidas.includes(caso.etapa)
      ? { pode: true }
      : { pode: false, motivo: "Esta ação não está disponível na etapa atual" };
}

/** Máscara de CPF para exibição padrão: ***.123.456-** */
export function mascararCpf(cpf: string): string {
   const d = cpf.replace(/\D/g, "");
   if (d.length !== 11) return "***.***.***-**";
   return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}
