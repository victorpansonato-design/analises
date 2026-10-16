/** Acompanhamento público do aluno (sem sessão): `GET /publico/acompanhamento/{token}`. */
import { http } from "msw";

import { acompanhamentoPorToken } from "@/mocks/db/acompanhamento";
import { API, erro, latencia, ok } from "@/mocks/lib/http";

export const handlersAcompanhamento = [
   http.get(`${API}/publico/acompanhamento/:token`, async ({ params }) => {
      await latencia();
      const dados = typeof params.token === "string" ? acompanhamentoPorToken(params.token) : null;
      if (!dados) return erro(404, "NAO_ENCONTRADO", "Acompanhamento não encontrado. Confira se o link está completo.");
      return ok(dados);
   }),
];
