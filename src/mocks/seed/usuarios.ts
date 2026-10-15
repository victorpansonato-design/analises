/**
 * Equipe FICTÍCIA. Um usuário-persona por papel (o seletor de papel troca entre eles) e o resto da
 * equipe para a distribuição e a fila "Equipe" fazerem sentido. A equipe de matrícula é configurável
 * na API real, nunca fixa no código (docs/03 §7).
 */
import type { Papel } from "@/features/sessao";

export interface UsuarioMock {
   id: string;
   usuario: string;
   nome: string;
   email: string;
   setor: string;
   papeis: Papel[];
   cursosCoordenados: string[];
}

function u(id: string, nome: string, setor: string, papeis: Papel[], cursosCoordenados: string[] = []): UsuarioMock {
   const usuario = nome
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/^prof(a)?\.\s*/, "")
      .split(" ")
      .filter((_, i, a) => i === 0 || i === a.length - 1)
      .join(".");
   return { id, usuario, nome, email: `${usuario}@example.com`, setor, papeis, cursosCoordenados };
}

export const CONSULTORES = [
   u("u-con-1", "Rafaela Nogueira", "Captação", ["CONSULTOR"]),
   u("u-con-2", "Tiago Brandão", "Captação", ["CONSULTOR"]),
   u("u-con-3", "Priscila Amaral", "Captação", ["CONSULTOR"]),
   u("u-con-4", "Danilo Sampaio", "Captação", ["CONSULTOR"]),
   u("u-con-5", "Michele Arantes", "Captação", ["CONSULTOR"]),
];

export const ANALISTAS = [
   u("u-ana-1", "Juliana Prado", "Análises acadêmicas", ["ANALISTA"]),
   u("u-ana-2", "Fábio Guimarães", "Análises acadêmicas", ["ANALISTA"]),
   u("u-ana-3", "Patrícia Lacerda", "Análises acadêmicas", ["ANALISTA"]),
   u("u-ana-4", "Roberto Siqueira", "Análises acadêmicas", ["ANALISTA"]),
   u("u-ana-5", "Simone Toledo", "Análises acadêmicas", ["ANALISTA"]),
   u("u-ana-6", "Marcos Valença", "Análises acadêmicas", ["ANALISTA"]),
];

export const MATRICULA = [
   u("u-mat-1", "Camila Duarte", "Matrícula", ["MATRICULA"]),
   u("u-mat-2", "Rogério Paiva", "Matrícula", ["MATRICULA"]),
   u("u-mat-3", "Fernanda Leme", "Matrícula", ["MATRICULA"]),
];

export const COORDENADORES = [
   u("u-coo-adm", "Prof. Eduardo Fontes", "Coordenação de Administração", ["COORDENADOR"], ["adm"]),
   u("u-coo-dir", "Profa. Regina Couto", "Coordenação de Direito", ["COORDENADOR"], ["dir"]),
   u("u-coo-eng", "Prof. Alexandre Neves", "Coordenação de Engenharia Civil", ["COORDENADOR"], ["eng"]),
   u("u-coo-psi", "Profa. Cláudia Rezende", "Coordenação de Psicologia", ["COORDENADOR"], ["psi"]),
   u("u-coo-cc", "Prof. Sérgio Matos", "Coordenação de Ciência da Computação", ["COORDENADOR"], ["cc"]),
   u("u-coo-enf", "Profa. Lúcia Fragoso", "Coordenação de Enfermagem", ["COORDENADOR"], ["enf"]),
   u("u-coo-cont", "Prof. Vagner Peixoto", "Coordenação de Ciências Contábeis", ["COORDENADOR"], ["cont"]),
   u("u-coo-ped", "Profa. Mônica Salles", "Coordenação de Pedagogia", ["COORDENADOR"], ["ped"]),
];

export const SUPORTE = [
   u("u-sup-1", "Bruno Antunes", "Suporte ao aluno", ["SUPORTE"]),
   u("u-sup-2", "Kátia Ribas", "Suporte ao aluno", ["SUPORTE"]),
];
export const DIRETORIA = [u("u-dir-1", "Helena Vasconcelos", "Diretoria e ouvidoria", ["DIRETORIA"])];
/** Gestora da equipe de vendas (consultores): única pessoa com a área de gestão, a pedido do produto. */
export const GESTAO = [u("u-ges-1", "Hellen Bueno", "Gestão comercial", ["GESTAO"])];
export const ADMINS = [u("u-adm-1", "Equipe Sistemas", "Tecnologia da informação", ["ADMIN"])];

export const USUARIOS: readonly UsuarioMock[] = [
   ...CONSULTORES,
   ...ANALISTAS,
   ...MATRICULA,
   ...COORDENADORES,
   ...SUPORTE,
   ...DIRETORIA,
   ...GESTAO,
   ...ADMINS,
];

/** Quem o seletor de papel coloca no sistema. */
export const PERSONA_POR_PAPEL: Record<Papel, UsuarioMock> = {
   CONSULTOR: CONSULTORES[0],
   ANALISTA: ANALISTAS[0],
   COORDENADOR: COORDENADORES[0],
   MATRICULA: MATRICULA[0],
   SUPORTE: SUPORTE[0],
   DIRETORIA: DIRETORIA[0],
   GESTAO: GESTAO[0],
   ADMIN: ADMINS[0],
};

const POR_ID = new Map(USUARIOS.map(x => [x.id, x]));

export function usuarioPorId(id: string | null | undefined): UsuarioMock | null {
   return id ? (POR_ID.get(id) ?? null) : null;
}

export function resumoUsuario(id: string | null | undefined): { id: string; nome: string } | null {
   const x = usuarioPorId(id);
   return x ? { id: x.id, nome: x.nome } : null;
}
