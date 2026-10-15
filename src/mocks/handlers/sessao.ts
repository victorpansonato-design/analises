/**
 * Sessão simulada. `/funcionarios/me` é o endpoint do SSO que o template já consulta; `/me` traz os
 * papéis (contrato). Os dois respondem com a persona do papel escolhido no seletor.
 */
import { http } from "msw";

import { API, latencia, ok, vazio } from "@/mocks/lib/http";
import { acessoDoPapel, usePapelSimuladoStore } from "@/features/sessao";

import { usuarioAtual } from "@/mocks/db/casos";

export const handlersSessao = [
   http.get(`${API}/funcionarios/me`, async () => {
      await latencia();
      const u = usuarioAtual();
      return ok({ usuario: u.usuario, nome: u.nome, email: u.email, setor: u.setor });
   }),
   http.get(`${API}/me`, async () => {
      await latencia();
      const u = usuarioAtual();
      return ok({
         id: u.id,
         usuario: u.usuario,
         nome: u.nome,
         email: u.email,
         setor: u.setor,
         papeis: u.papeis,
         cursosCoordenados: u.cursosCoordenados,
         acesso: acessoDoPapel(usePapelSimuladoStore.getState().papel),
      });
   }),
   http.post(`${API}/logout`, async () => {
      await latencia();
      return vazio();
   }),
];
