/**
 * Cor de cada situação da meta (DS §12: status = ponto + palavra). "No ritmo" fica em silêncio
 * (nada a fazer); só quem está abaixo do ritmo ou não bateu a meta fica vermelho.
 */
import type { MeterTone } from "@/components/core/meter-bar";
import type { StatusTone } from "@/components/core/status";

import type { SituacaoMeta } from "@/features/gestao/types/gestao.schema";

export const TOM_SITUACAO: Record<SituacaoMeta, StatusTone> = {
   ATINGIDA: "info",
   NO_RITMO: "ok",
   ATENCAO: "warn",
   ABAIXO: "crit",
   NAO_ATINGIDA: "crit",
   SEM_META: "muted",
};

export const TOM_METER: Record<SituacaoMeta, MeterTone> = {
   ATINGIDA: "brand",
   NO_RITMO: "brand",
   ATENCAO: "warn",
   ABAIXO: "crit",
   NAO_ATINGIDA: "crit",
   SEM_META: "ink",
};
