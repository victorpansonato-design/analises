import { http } from "msw";

import { API, latencia, ok } from "@/mocks/lib/http";
import { alunosDispensa, gradesDispensa } from "@/mocks/seed/dispensa";

export const handlersDispensa = [
   http.get(`${API}/calculo-dispensa/catalogo`, async () => {
      await latencia();
      return ok(gradesDispensa);
   }),
   http.get(`${API}/calculo-dispensa/alunos/:ra`, async ({ params }) => {
      await latencia();
      return ok(alunosDispensa.find(a => a.ra === params.ra) ?? null);
   }),
];
