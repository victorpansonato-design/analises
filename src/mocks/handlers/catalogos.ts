/** Catálogos simulados: cursos, matrizes, instituições de origem, usuários e parâmetros. */
import { http } from "msw";

import { searchKey } from "@/lib/format";

import { CALENDARIO_PADRAO, DISTRIBUICAO, IA, REGRAS_ANALISE, REGUA, SLA_POR_ETAPA, UI } from "@/features/casos";

import { API, latencia, ok } from "@/mocks/lib/http";
import { FERIADOS_NACIONAIS } from "@/mocks/seed/calendario";
import { CURSOS, IES_FICTICIAS, matrizesDoCurso } from "@/mocks/seed/cursos";
import { USUARIOS, resumoUsuario } from "@/mocks/seed/usuarios";

export const handlersCatalogos = [
   http.get(`${API}/cursos`, async () => {
      await latencia();
      return ok(
         CURSOS.map(c => ({
            id: c.id,
            nome: c.nome,
            turnos: c.turnos,
            modalidades: c.modalidades,
            coordenador: resumoUsuario(c.coordenadorId),
            vagasDisponiveis: c.vagasDisponiveis,
         })),
      );
   }),
   http.get(`${API}/matrizes`, async ({ request }) => {
      await latencia();
      const curso = new URL(request.url).searchParams.get("curso");
      return ok(curso && CURSOS.some(c => c.id === curso) ? matrizesDoCurso(curso) : []);
   }),
   http.get(`${API}/instituicoes`, async ({ request }) => {
      await latencia();
      const q = searchKey(new URL(request.url).searchParams.get("q") ?? "");
      return ok(IES_FICTICIAS.filter(i => searchKey(`${i.nome} ${i.sigla ?? ""}`).includes(q)).slice(0, 8));
   }),
   http.get(`${API}/usuarios`, async ({ request }) => {
      await latencia();
      const papel = new URL(request.url).searchParams.get("papel");
      return ok(USUARIOS.filter(u => !papel || u.papeis.some(p => p === papel)).map(u => ({ id: u.id, nome: u.nome, papeis: u.papeis })));
   }),
   http.get(`${API}/parametros`, async () => {
      await latencia();
      return ok({
         calendario: { ...CALENDARIO_PADRAO, feriados: FERIADOS_NACIONAIS },
         sla: SLA_POR_ETAPA,
         regua: REGUA,
         regras: REGRAS_ANALISE,
         ia: IA,
         distribuicao: DISTRIBUICAO,
         ui: UI,
      });
   }),
];
