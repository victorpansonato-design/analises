/**
 * Sessão: quem está usando o sistema e com quais papéis (docs/04). Papel age sobre AÇÕES e campos
 * sensíveis. A única tela restrita é a de gestão (indicadores e metas da equipe): só `GESTAO`.
 *
 * Contrato: `GET /me` (contracts/openapi.yaml, schema `Me`).
 */
import { z } from "zod";

export const PAPEIS = ["CONSULTOR", "ANALISTA", "COORDENADOR", "MATRICULA", "SUPORTE", "DIRETORIA", "GESTAO", "ADMIN"] as const;
export const PapelSchema = z.enum(PAPEIS);
export type Papel = z.infer<typeof PapelSchema>;

export const ROTULO_PAPEL: Record<Papel, string> = {
   CONSULTOR: "Consultor de vendas",
   ANALISTA: "Analista",
   COORDENADOR: "Coordenação",
   MATRICULA: "Matrícula",
   SUPORTE: "Suporte ao aluno",
   DIRETORIA: "Diretoria e ouvidoria",
   GESTAO: "Gestão comercial",
   ADMIN: "Administração do sistema",
};

/**
 * Acessos (decisão de 14/10/2026): só três. Papel continua dizendo a responsabilidade de cada um
 * (distribuição, autoria, notificações); acesso diz o que a pessoa vê.
 * - TODOS: todo mundo, o sistema inteiro menos a área de gestão.
 * - GESTAO: gestão comercial (Hellen Bueno), com a área de indicadores e metas.
 * - COORDENACAO: coordenadores de curso. [VALIDAR] por enquanto vê o mesmo que TODOS.
 */
export const ACESSOS = ["TODOS", "GESTAO", "COORDENACAO"] as const;
export type Acesso = (typeof ACESSOS)[number];

export const ROTULO_ACESSO: Record<Acesso, string> = {
   TODOS: "Todos",
   GESTAO: "Gestão comercial",
   COORDENACAO: "Coordenadores",
};

/** Papel que representa cada acesso na simulação (a persona que o MSW devolve em `/me`). */
export const PAPEL_DO_ACESSO: Record<Acesso, Papel> = {
   TODOS: "ANALISTA",
   GESTAO: "GESTAO",
   COORDENACAO: "COORDENADOR",
};

/** Acesso do papel simulado; qualquer papel fora dos três cai em TODOS. */
export function acessoDoPapel(papel: Papel): Acesso {
   return ACESSOS.find(a => PAPEL_DO_ACESSO[a] === papel) ?? "TODOS";
}

export const MeSchema = z.object({
   id: z.string(),
   usuario: z.string(),
   nome: z.string(),
   email: z.string(),
   setor: z.string().nullable(),
   papeis: z.array(PapelSchema).min(1),
   cursosCoordenados: z.array(z.string()),
   /** EXTENSÃO [VALIDAR com o TI]: o que a pessoa vê (Todos, Gestão comercial ou Coordenadores). */
   acesso: z.enum(ACESSOS).default("TODOS"),
});
export type Me = z.infer<typeof MeSchema>;
