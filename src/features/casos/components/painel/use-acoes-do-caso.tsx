/**
 * Executor único das ações do caso, usado pelo card "Próximo passo", por "Mais ações" e pelo atalho
 * E. Cada ação vai para o lugar certo: chamada direta (assumir, lembrar), diálogo com motivo
 * (transições) ou a aba já no ponto (proposta com o modal aberto, análise filtrada).
 */
import { useState, type ReactNode } from "react";

import { notificar } from "@/lib/notify";
import { registrarUi } from "@/services/telemetria";

import { useAtribuir, useLembrarDocumentos } from "@/features/casos/api/casos.mutations";
import type { NomeAcao } from "@/features/casos/domain/acoes";
import type { Destino } from "@/features/casos/domain/proximo-passo";
import { temDialogoDeTransicao } from "@/features/casos/components/painel/config-transicao";
import { DialogoTransicao } from "@/features/casos/components/painel/dialogo-transicao";
import { DialogoAtribuir, DialogoFlag, DialogoPendencia } from "@/features/casos/components/painel/dialogos-caso";
import { useCasosUrlState } from "@/features/casos/hooks/use-casos-url-state";
import type { AcaoTransicao, CasoDetalhe } from "@/features/casos/types/caso.schema";

type Dialogo =
   | { tipo: "transicao"; acao: AcaoTransicao }
   | { tipo: "atribuir" }
   | { tipo: "pendencia" }
   | { tipo: "flag"; flag: "ouvidoria" | "escalado" }
   | null;

const NA_PROPOSTA: readonly NomeAcao[] = ["ENVIAR_PROPOSTA", "REGISTRAR_RESPOSTA", "EFETIVAR_MATRICULA"];

export function useAcoesDoCaso(caso: CasoDetalhe): {
   executar: (acao: NomeAcao, ir?: Destino) => void;
   dialogos: ReactNode;
   ocupado: boolean;
} {
   const { irPara, abrirNovoProtocolo } = useCasosUrlState();
   const [dialogo, setDialogo] = useState<Dialogo>(null);
   const atribuir = useAtribuir(caso);
   const lembrar = useLembrarDocumentos(caso.id);
   const fechar = () => setDialogo(null);

   function executar(acao: NomeAcao, ir?: Destino) {
      if (ir) {
         irPara(ir.aba === "analise" ? { aba: "analise", extras: { filtro: ir.filtro } } : { aba: "proposta", extras: { acao: ir.acao } });
         return;
      }
      if (NA_PROPOSTA.includes(acao)) return irPara({ aba: "proposta", extras: { acao } });
      switch (acao) {
         case "ASSUMIR":
            return atribuir.mutate("EU", { onSuccess: () => notificar({ titulo: "Caso atribuído a você", detalhe: caso.candidato.nome }) });
         case "ATRIBUIR":
            return setDialogo({ tipo: "atribuir" });
         case "SOLICITAR_DOCUMENTO":
            return lembrar.mutate(undefined, {
               onSuccess: () =>
                  notificar({ titulo: "Lembrete enviado pelo WhatsApp", detalhe: "O candidato recebe a lista do que falta." }),
            });
         case "MARCAR_OUVIDORIA":
            return setDialogo({ tipo: "flag", flag: "ouvidoria" });
         case "ESCALAR":
            return setDialogo({ tipo: "flag", flag: "escalado" });
         case "REGISTRAR_PENDENCIA":
            return setDialogo({ tipo: "pendencia" });
         case "NOVO_PROTOCOLO":
            return abrirNovoProtocolo(caso.id);
         case "EXPORTAR":
            return irPara({ aba: "analise", extras: { imprimir: "1" } });
         case "SOLICITAR_REANALISE":
            // A reabertura escolhe as disciplinas contestadas: abre na aba Análise, com a grade à mão.
            return irPara({ aba: "analise", extras: { acao: "reabrir" } });
         case "RESPONDER_ITEM_COORDENACAO":
            return irPara({ aba: "analise", extras: { filtro: "coordenacao" } });
         case "REEXECUTAR_PRE_ANALISE":
         case "DECIDIR_ITEM":
            return irPara({ aba: "analise" });
         case "EDITAR_DADOS":
            return irPara({ aba: "dados" });
         default:
            if (temDialogoDeTransicao(acao)) setDialogo({ tipo: "transicao", acao });
      }
   }

   const dialogos = (
      <>
         <DialogoTransicao caso={caso} acao={dialogo?.tipo === "transicao" ? dialogo.acao : null} onClose={fechar} />
         <DialogoAtribuir key={`atribuir-${caso.id}`} caso={caso} aberto={dialogo?.tipo === "atribuir"} onClose={fechar} />
         <DialogoPendencia key={`pendencia-${caso.id}`} caso={caso} aberto={dialogo?.tipo === "pendencia"} onClose={fechar} />
         <DialogoFlag caso={caso} flag={dialogo?.tipo === "flag" ? dialogo.flag : null} onClose={fechar} />
      </>
   );

   return { executar, dialogos, ocupado: atribuir.isPending || lembrar.isPending };
}

/** Clique numa ação desabilitada: mede onde a interface confunde (docs/10 §6). */
export function registrarDesabilitada(acao: NomeAcao, motivo: string | undefined): void {
   registrarUi("ui.acao_desabilitada_clicada", { acao, motivo: motivo ?? "" });
}
