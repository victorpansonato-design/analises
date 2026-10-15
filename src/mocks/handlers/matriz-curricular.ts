/**
 * Matriz curricular simulada. A busca usa o mesmo domínio da tela (`buscarOfertas`): nome sem
 * acento ou código pelo começo, só currículos ativos e turno apenas no presencial.
 */
import { http } from "msw";

import { buscarOfertas, ModalidadeMatrizSchema, TurnoMatrizSchema } from "@/features/matriz-curricular";

import { API, erro, latencia, ok } from "@/mocks/lib/http";
import { curriculoPorId, OFERTAS_MATRIZ } from "@/mocks/seed/matrizes";

export const handlersMatrizCurricular = [
   http.get(`${API}/matrizes-curriculares`, async ({ request }) => {
      await latencia();
      const url = new URL(request.url);
      const modalidade = ModalidadeMatrizSchema.safeParse(url.searchParams.get("modalidade"));
      const turno = TurnoMatrizSchema.safeParse(url.searchParams.get("turno"));
      return ok(
         buscarOfertas(OFERTAS_MATRIZ, {
            q: url.searchParams.get("q") ?? "",
            modalidade: modalidade.success ? modalidade.data : null,
            turno: turno.success ? turno.data : null,
         }),
      );
   }),
   http.get(`${API}/matrizes-curriculares/:id`, async ({ params }) => {
      await latencia();
      const curriculo = curriculoPorId(String(params.id));
      if (!curriculo) return erro(404, "CURRICULO_NAO_ENCONTRADO", "Currículo não encontrado.");
      return ok(curriculo);
   }),
];
