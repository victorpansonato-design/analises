/**
 * "Exportar N casos" exporta EXATAMENTE o filtro da tela (DS §10.14), percorrendo todas as páginas.
 * Sem CPF, celular nem e-mail: a exportação não leva dado sensível (docs/04 §3).
 */
import { baixarCsv } from "@/lib/csv";
import { fullDate } from "@/lib/format";
import api from "@/services/api";
import type { ApiResponse } from "@/services/types";

import type { FiltrosFila } from "@/features/casos/api/casos.keys";
import { lerSla, rotuloSla } from "@/features/casos/domain/sla";
import {
   PaginaCasosSchema,
   ROTULO_ETAPA,
   ROTULO_MODALIDADE,
   ROTULO_TIPO_COMPLETO,
   ROTULO_TURNO,
   type CasoResumo,
} from "@/features/casos/types/caso.schema";

export async function exportarFila(filtros: FiltrosFila): Promise<number> {
   const casos: CasoResumo[] = [];
   let cursor: string | null = null;
   do {
      const { data }: { data: ApiResponse<unknown> } = await api.get("/casos", {
         params: {
            visao: filtros.visao,
            etapa: filtros.etapa ?? undefined,
            processo: filtros.processo ?? undefined,
            tipo: filtros.tipo ?? undefined,
            curso: filtros.curso ?? undefined,
            turno: filtros.turno ?? undefined,
            modalidade: filtros.modalidade ?? undefined,
            responsavel: filtros.responsavel ?? undefined,
            somenteAtrasados: filtros.somenteAtrasados || undefined,
            comPendencia: filtros.comPendencia || undefined,
            ouvidoria: filtros.ouvidoria || undefined,
            incluirEncerrados: filtros.incluirEncerrados || undefined,
            ciclo: filtros.ciclo ?? undefined,
            q: filtros.q || undefined,
            ordem: filtros.ordem,
            cursor: cursor ?? undefined,
            limite: 200,
         },
      });
      const pagina = PaginaCasosSchema.parse(data.data);
      casos.push(...pagina.itens);
      cursor = pagina.proximoCursor;
   } while (cursor);

   const agora = new Date();
   baixarCsv(
      "analises-fila",
      [
         "Protocolo",
         "Candidato",
         "RA",
         "Tipo",
         "Curso",
         "Turno",
         "Modalidade",
         "Ciclo",
         "Etapa",
         "Inclusão",
         "Matriculado",
         "Liberada matrícula",
         "Prazo",
      ],
      casos.map(c => [
         c.protocolo,
         c.candidato.nome,
         c.candidato.ra,
         ROTULO_TIPO_COMPLETO[c.tipo],
         c.destino.cursoNome,
         ROTULO_TURNO[c.destino.turno],
         ROTULO_MODALIDADE[c.destino.modalidade],
         c.destino.ciclo,
         ROTULO_ETAPA[c.etapa],
         fullDate(c.criadoEm),
         c.matriculado ? "Sim" : "Não",
         c.liberadoMatriculaEm ? fullDate(c.liberadoMatriculaEm) : "",
         rotuloSla(lerSla(c.sla, agora), c.sla.pausadoAte),
      ]),
   );
   return casos.length;
}
