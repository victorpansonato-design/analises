/**
 * Telemetria de interface (docs/10 §6): mede o ESFORÇO de usar a tela, sem dado pessoal (nada de
 * nome, CPF ou texto digitado; no máximo ids técnicos e contagens). Os eventos vão em lote para
 * `POST /telemetria` [VALIDAR com TI]; falha de envio é silenciosa e nunca atrapalha o trabalho.
 */
import api from "@/services/api";

export type EventoUi =
   | "ui.caso_aberto"
   | "ui.pegar_proximo"
   | "ui.aceite_em_lote"
   | "ui.atalho_usado"
   | "ui.acao_desabilitada_clicada"
   | "ui.interacao_analise";

interface Registro {
   nome: EventoUi;
   em: string;
   dados: Record<string, string | number | boolean>;
}

const fila: Registro[] = [];
let agendado: number | null = null;

function enviar(): void {
   agendado = null;
   if (fila.length === 0) return;
   const lote = fila.splice(0, fila.length);
   api.post("/telemetria", lote).catch(() => undefined);
}

export function registrarUi(nome: EventoUi, dados: Registro["dados"] = {}): void {
   fila.push({ nome, em: new Date().toISOString(), dados });
   if (agendado === null && typeof window !== "undefined") agendado = window.setTimeout(enviar, 5_000);
}
