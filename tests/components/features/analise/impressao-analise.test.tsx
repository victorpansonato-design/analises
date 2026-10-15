import { render, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ImpressaoAnalise } from "@/features/analise/components/impressao-analise";
import { montarAnalise } from "@/mocks/db/analise";
import { montarDetalhe, usuarioAtual } from "@/mocks/db/casos";
import { db } from "@/mocks/db/estado";
import { iniciarDb } from "@/mocks/db/iniciar";
import { analiseDoCaso } from "@/mocks/db/repositorio";
import { decidido, item, origem } from "../../../unit/features/analise/fixtures";

beforeEach(() => iniciarDb());

describe("relatório para consulta rápida", () => {
   function dados() {
      const registro = db.casos.get("c-demo-analise")!;
      const analise = montarAnalise(analiseDoCaso(registro)!);
      return { caso: montarDetalhe(registro, usuarioAtual(), new Date()), analise };
   }
   it("exporta toda a matriz em portal, identifica aluno e protocolo e traz aviso e cores das três cargas", () => {
      const { caso, analise } = dados();
      const { container } = render(
         <ImpressaoAnalise caso={caso} analise={analise} origemPorId={new Map(analise.origem.map(o => [o.id, o]))} />,
      );
      const report = document.querySelector(".relatorio-analise")!;
      expect(container).not.toContainElement(report as HTMLElement);
      expect(report.parentElement).toBe(document.body);
      expect(within(report as HTMLElement).getByText(caso.candidato.nome)).toBeInTheDocument();
      expect(report.querySelectorAll("tbody tr")).toHaveLength(analise.itens.length);
      expect(report).toHaveTextContent(caso.protocolo);
      expect(report).toHaveTextContent("Documento apenas para consulta rápida, sujeito a alterações.");
      expect(report.querySelectorAll(".relatorio-horas")).toHaveLength(3);
      expect(report.querySelector('[data-tom="complementares"]')).toHaveTextContent("Atividades complementares");
      expect(report.querySelector('[data-tom="extensionista"]')).toHaveTextContent("Prática extensionista");
      expect(report.querySelector('[data-tom="eletivas"]')).toHaveTextContent("Carga não informada na matriz");
   });
   it("não imprime sugestão como dispensa ou origem confirmada e preserva múltiplas origens e notas", () => {
      const { caso, analise } = dados();
      analise.itens = [
         item("pendente", { disciplina: "Eletiva I" }),
         decidido("confirmada", "DISPENSA", {
            disciplina: "Equivalência confirmada",
            decisao: {
               valor: "DISPENSA",
               origemIds: ["o1", "o2"],
               origem: "ANALISTA",
               por: { id: "a", nome: "Analista" },
               em: caso.criadoEm,
            },
         }),
      ];
      const origens = new Map(
         [origem("o1", { nome: "Origem um", nota: 8.5 }), origem("o2", { nome: "Origem dois", nota: null })].map(o => [o.id, o]),
      );
      render(<ImpressaoAnalise caso={caso} analise={analise} origemPorId={origens} />);
      const linhas = document.querySelectorAll(".relatorio-analise tbody tr");
      expect(linhas[0]).not.toHaveTextContent(/sem decisão/i);
      expect(document.querySelector(".relatorio-analise")).not.toHaveTextContent(/sem decisão/i);
      expect(linhas[0]).not.toHaveTextContent("Origem um");
      expect(linhas[1]).toHaveTextContent("Origem um");
      expect(linhas[1]).toHaveTextContent("Origem dois");
      expect(linhas[1]).toHaveTextContent("Nota 8,50");
      expect(linhas[1]).toHaveTextContent("Nota não informada");
      expect(linhas[1]).toHaveTextContent("Dispensa");
   });
});
