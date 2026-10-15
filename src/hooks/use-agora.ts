/**
 * Relógio da tela: devolve "agora" e reavalia em intervalo. Prazos (SLA) e carimbos relativos usam
 * este valor para continuarem certos com a tela aberta, sem cada componente criar o próprio timer.
 */
import { useEffect, useState } from "react";

export function useAgora(intervaloMs = 30_000): Date {
   const [agora, setAgora] = useState(() => new Date());
   useEffect(() => {
      const id = window.setInterval(() => setAgora(new Date()), intervaloMs);
      return () => window.clearInterval(id);
   }, [intervaloMs]);
   return agora;
}
