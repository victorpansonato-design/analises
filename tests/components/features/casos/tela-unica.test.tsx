import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "@/components/core/segmented-control";
import { LinhaFila } from "@/features/casos/components/fila/linha-fila";
import { ProximoPassoCard } from "@/features/casos/components/painel/proximo-passo-card";
import type { CasoDetalhe, CasoResumo } from "@/features/casos";

import { renderComProviders } from "../../../helpers/render";

const AGORA = new Date("2026-10-09T15:00:00Z");
const em = (min: number) => new Date(AGORA.getTime() + min * 60_000).toISOString();

function resumo(over: Partial<CasoResumo> = {}): CasoResumo {
   return {
      id: "c1",
      protocolo: "85560",
      tipo: "TRANSFERENCIA_EXTERNA",
      subtipo: null,
      etapa: "EM_ANALISE",
      etapaDesde: em(-600),
      criadoEm: "2026-10-01T12:00:00Z",
      matriculado: false,
      liberadoMatriculaEm: null,
      candidato: { nome: "Candidata Exemplo", ra: null },
      destino: { cursoId: "adm", cursoNome: "Administração", turno: "NOTURNO", modalidade: "PRESENCIAL", matrizId: null, ciclo: "2027.1" },
      responsavel: null,
      sla: { venceEm: em(-120), alertaEm: em(-200), pausadoAte: null },
      pendencia: null,
      flags: { ouvidoria: false, escalado: false, preAnaliseFalhou: false },
      reanalises: 0,
      versao: 1,
      ...over,
   };
}

describe("LinhaFila", () => {
   it("mostra dono, prazo estourado e abre o caso", () => {
      const abrir = vi.fn();
      renderComProviders(<LinhaFila caso={resumo()} ativa={false} mostrarEtapa={false} agora={AGORA} onAbrir={abrir} />);
      expect(screen.getByText("Candidata Exemplo")).toBeInTheDocument();
      expect(screen.getByText("atrasado 2 h")).toBeInTheDocument();
      expect(screen.getByText("Sem responsável")).toBeInTheDocument();
      expect(screen.getByText("85560")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button"));
      expect(abrir).toHaveBeenCalledWith("c1");
   });

   it("usa o RA quando existe e as iniciais do responsável", () => {
      renderComProviders(
         <LinhaFila
            caso={resumo({ candidato: { nome: "Outra Pessoa", ra: "2345678" }, responsavel: { id: "u", nome: "Juliana Prado" } })}
            ativa
            mostrarEtapa
            agora={AGORA}
            onAbrir={() => undefined}
         />,
      );
      expect(screen.getByText("RA 2345678")).toBeInTheDocument();
      expect(screen.getByText("Responsável: Juliana Prado")).toBeInTheDocument();
      expect(screen.getByRole("button")).toHaveAttribute("aria-current", "true");
   });
});

describe("SegmentedControl", () => {
   const opcoes = [
      { value: "DISPENSA", label: "Dispensa" },
      { value: "REGULAR", label: "Regular" },
   ] as const;
   it("é um grupo de rádio navegável pelas setas", () => {
      const mudar = vi.fn();
      renderComProviders(<SegmentedControl options={opcoes} value="DISPENSA" onChange={mudar} layoutId="t1" ariaLabel="Decisão" />);
      const dispensa = screen.getByRole("radio", { name: "Dispensa" });
      expect(dispensa).toHaveAttribute("aria-checked", "true");
      fireEvent.keyDown(dispensa, { key: "ArrowRight" });
      expect(mudar).toHaveBeenCalledWith("REGULAR");
   });
});

function detalhe(over: Partial<CasoDetalhe> = {}): CasoDetalhe {
   return {
      ...resumo({ responsavel: { id: "u-ana", nome: "Juliana Prado" }, sla: { venceEm: em(300), alertaEm: em(200), pausadoAte: null } }),
      etapaAnterior: null,
      candidato: {
         pessoaId: "p",
         nome: "Candidata Exemplo",
         ra: null,
         outroRa: null,
         cpfMascarado: "***.000.000-**",
         celular: null,
         email: null,
         optInWhatsapp: true,
      },
      origem: { iesNome: null, cursoNome: null, estudouForaNoPeriodo: null },
      ingresso: { ano: 2027, semestre: 1, periodo: null },
      responsaveis: { consultor: null, analista: null, coordenador: null, matricula: null },
      contadores: { documentosObrigatorios: 3, documentosAceitos: 3, itensMatriz: 45, itensSemDecisao: 9, perguntasAbertas: 0 },
      resumoCongeladoEm: null,
      noGed: true,
      jornada: [],
      acoesDisponiveis: [
         { acao: "CONCLUIR_ANALISE", habilitada: false, motivos: ["Faltam 9 disciplinas sem decisão"], exigeMotivo: false },
      ],
      criadoEm: em(-5000),
      atualizadoEm: em(-10),
      ...over,
   };
}

describe("ProximoPassoCard", () => {
   it("tem no máximo uma ação primária e explica por que está bloqueada", () => {
      const executar = vi.fn();
      renderComProviders(<ProximoPassoCard caso={detalhe()} meuId="u-ana" agora={AGORA} ocupado={false} onExecutar={executar} />);
      expect(screen.getByText("Revisar 9 disciplinas pendentes")).toBeInTheDocument();
      expect(screen.getByText("faltam 5 h")).toBeInTheDocument();
      expect(screen.getByText("Faltam 9 disciplinas sem decisão")).toBeInTheDocument();
      const concluir = screen.getByRole("button", { name: /Concluir análise/ });
      expect(concluir).toHaveAttribute("aria-disabled", "true");
      fireEvent.click(concluir);
      expect(executar).not.toHaveBeenCalled();
   });

   it("ação habilitada executa", () => {
      const executar = vi.fn();
      renderComProviders(
         <ProximoPassoCard
            caso={detalhe({
               contadores: { ...detalhe().contadores, itensSemDecisao: 0 },
               acoesDisponiveis: [{ acao: "CONCLUIR_ANALISE", habilitada: true, motivos: [], exigeMotivo: false }],
            })}
            meuId="u-ana"
            agora={AGORA}
            ocupado={false}
            onExecutar={executar}
         />,
      );
      fireEvent.click(screen.getByRole("button", { name: /Concluir análise/ }));
      expect(executar).toHaveBeenCalledWith("CONCLUIR_ANALISE", undefined);
   });
});
