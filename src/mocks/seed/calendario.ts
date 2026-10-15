/**
 * Calendário dos mocks: expediente de `CALENDARIO_PADRAO` com os feriados nacionais de 2026 e 2027
 * (docs/15 §1). Na API real os feriados vêm de `GET /parametros`.
 */
import { CALENDARIO_PADRAO, type Calendario } from "@/features/casos";

export const FERIADOS_NACIONAIS = [
   "2026-01-01",
   "2026-02-16",
   "2026-02-17",
   "2026-04-03",
   "2026-04-21",
   "2026-05-01",
   "2026-06-04",
   "2026-09-07",
   "2026-10-12",
   "2026-11-02",
   "2026-11-15",
   "2026-11-20",
   "2026-12-25",
   "2027-01-01",
   "2027-02-08",
   "2027-02-09",
   "2027-03-26",
   "2027-04-21",
   "2027-05-01",
   "2027-05-27",
   "2027-09-07",
   "2027-10-12",
   "2027-11-02",
   "2027-11-15",
   "2027-11-20",
   "2027-12-25",
] as const;

export const CALENDARIO_MOCK: Calendario = { ...CALENDARIO_PADRAO, feriados: FERIADOS_NACIONAIS };
