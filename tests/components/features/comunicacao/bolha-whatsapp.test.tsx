/** A bolha mostra a mensagem como o candidato vê: quebras, botões e variável vazia destacada. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BolhaWhatsapp } from "@/features/comunicacao";

describe("BolhaWhatsapp", () => {
   it("destaca a variável vazia e lista os botões de resposta rápida", () => {
      render(
         <BolhaWhatsapp
            texto={"Ana, só falta: [documentos].\nPode mandar por aqui."}
            faltando={["documentos"]}
            botoes={["Enviar agora", "Preciso de ajuda"]}
         />,
      );
      const marca = screen.getByText("[documentos]");
      expect(marca.tagName).toBe("MARK");
      expect(marca).toHaveAttribute("title", "Falta: documentos pendentes");
      const botoes = screen.getByRole("list", { name: "Botões de resposta rápida" });
      expect(botoes.querySelectorAll("li")).toHaveLength(2);
   });

   it("sem variável faltando, colchete é texto comum", () => {
      render(<BolhaWhatsapp texto="Texto [livre]" />);
      expect(screen.getByText("Texto [livre]").tagName).toBe("SPAN");
      expect(screen.queryByRole("list")).toBeNull();
   });
});
