import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LookupPessoa } from "@/features/protocolo";

// CPF fictício de exemplo (dígitos verificadores corretos).
const CPF = "12345678909";

const CURSOS = [
   {
      id: "adm",
      nome: "Administração",
      turnos: ["NOTURNO"],
      modalidades: ["PRESENCIAL"],
      coordenador: { id: "u-c", nome: "Coordenação Teste" },
      vagasDisponiveis: null,
   },
   {
      id: "dir",
      nome: "Direito",
      turnos: ["MATUTINO", "NOTURNO"],
      modalidades: ["PRESENCIAL"],
      coordenador: { id: "u-d", nome: "Coordenação Teste" },
      vagasDisponiveis: null,
   },
];

const LOOKUP_DUPLICADO: LookupPessoa = {
   encontrada: true,
   pessoa: { pessoaId: "p-1", nome: "Pessoa Fictícia", celular: "11987654321", email: "pessoa@exemplo.test", ra: null },
   vinculo: "NENHUM",
   tipoSugerido: null,
   casosAtivos: [
      {
         id: "c-existente",
         protocolo: "85560",
         tipo: "TRANSFERENCIA_EXTERNA",
         subtipo: null,
         etapa: "AGUARDANDO_DOCUMENTOS",
         etapaDesde: "2026-10-01T12:00:00-03:00",
         criadoEm: "2026-10-01T12:00:00Z",
         matriculado: false,
         liberadoMatriculaEm: null,
         candidato: { nome: "Pessoa Fictícia", ra: null },
         destino: {
            cursoId: "adm",
            cursoNome: "Administração",
            turno: "NOTURNO",
            modalidade: "PRESENCIAL",
            matrizId: null,
            ciclo: "2027.1",
         },
         responsavel: null,
         sla: { venceEm: null, alertaEm: null, pausadoAte: null },
         pendencia: null,
         flags: { ouvidoria: false, escalado: false, preAnaliseFalhou: false },
         reanalises: 0,
         versao: 1,
      },
   ],
   dadosVestibular: null,
};

const lookupAtual = vi.fn<(cpf: string) => LookupPessoa | undefined>();

vi.mock("@/features/casos", async importOriginal => {
   const real = await importOriginal<typeof import("@/features/casos")>();
   return {
      ...real,
      useCursos: () => ({ data: CURSOS, isLoading: false, isError: false }),
      useCaso: () => ({ data: undefined, isLoading: false, isError: false }),
      useInstituicoes: () => ({ data: [], isLoading: false, isError: false }),
   };
});

vi.mock("@/features/protocolo/api/protocolo.queries", () => ({
   protocoloKeys: { all: ["protocolo"] },
   useLookupPessoa: (cpf: string) => ({ data: lookupAtual(cpf), isFetching: false, isError: false, refetch: vi.fn() }),
}));

const { NovoProtocoloDrawer } = await import("@/features/protocolo/components/novo-protocolo-drawer");
const { useRascunhoProtocoloStore } = await import("@/features/protocolo/stores/rascunho-protocolo.store");

function renderizar() {
   const onAbrirCaso = vi.fn();
   const onCriado = vi.fn();
   const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
   render(
      <QueryClientProvider client={client}>
         <NovoProtocoloDrawer open onOpenChange={vi.fn()} onCriado={onCriado} onAbrirCaso={onAbrirCaso} />
      </QueryClientProvider>,
   );
   return { onAbrirCaso, onCriado };
}

describe("NovoProtocoloDrawer", () => {
   beforeEach(() => {
      sessionStorage.clear();
      useRascunhoProtocoloStore.getState().descartar();
      lookupAtual.mockReset();
      lookupAtual.mockReturnValue(undefined);
   });

   it("mostra o CPF com máscara e explica o CPF inválido", () => {
      renderizar();
      const cpf = screen.getByLabelText(/CPF/);
      fireEvent.change(cpf, { target: { value: "111.111.111-11" } });
      expect(cpf).toHaveValue("111.111.111-11");
      expect(screen.getByText("CPF inválido. Confira os 11 dígitos.")).toBeInTheDocument();
   });

   it("caso ativo no mesmo curso bloqueia o envio e oferece abrir o existente", () => {
      lookupAtual.mockImplementation(cpf => (cpf === CPF ? LOOKUP_DUPLICADO : undefined));
      const { onAbrirCaso } = renderizar();
      fireEvent.change(screen.getByLabelText(/CPF/), { target: { value: CPF } });
      expect(screen.getByLabelText(/Nome completo/)).toHaveValue("Pessoa Fictícia");

      fireEvent.change(screen.getByLabelText(/Curso de destino/), { target: { value: "adm" } });

      const abrir = screen.getByRole("button", { name: "Abrir caso existente" });
      expect(screen.getByRole("button", { name: "Abrir protocolo" })).toBeDisabled();
      expect(screen.getByText(/Já existe um caso ativo deste candidato para Administração/)).toBeInTheDocument();
      fireEvent.click(abrir);
      expect(onAbrirCaso).toHaveBeenCalledWith("c-existente");
   });

   it("outro curso não bloqueia: só avisa", () => {
      lookupAtual.mockImplementation(cpf => (cpf === CPF ? LOOKUP_DUPLICADO : undefined));
      renderizar();
      fireEvent.change(screen.getByLabelText(/CPF/), { target: { value: CPF } });
      fireEvent.change(screen.getByLabelText(/Curso de destino/), { target: { value: "dir" } });
      expect(screen.queryByRole("button", { name: "Abrir caso existente" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Abrir protocolo" })).toBeEnabled();
      expect(screen.getByText(/Também tem 1 caso ativo/)).toBeInTheDocument();
   });

   it("mostra antes de confirmar o que vai acontecer", () => {
      renderizar();
      expect(
         screen.getByText("Vamos enviar ao candidato, pelo WhatsApp, a lista de documentos. Você será avisado se precisar agir."),
      ).toBeInTheDocument();
   });
});
