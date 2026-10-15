/**
 * Sobe o backend simulado: semeia os casos e as notificações de partida de cada persona.
 */
import type { Notificacao } from "@/features/notificacoes";

import { db } from "@/mocks/db/estado";
import { semearCasos } from "@/mocks/seed/casos";
import { PERSONA_POR_PAPEL } from "@/mocks/seed/usuarios";

function notificacoesIniciais(agora: Date): Map<string, Notificacao[]> {
   const em = (min: number) => new Date(agora.getTime() - min * 60_000).toISOString();
   const n = (
      id: string,
      tipo: Notificacao["tipo"],
      casoId: string,
      titulo: string,
      detalhe: string,
      min: number,
      lida = false,
   ): Notificacao => ({
      id,
      tipo,
      casoId,
      titulo,
      detalhe,
      em: em(min),
      lida,
   });
   const caso = (id: string) => db.casos.get(id);
   const nome = (id: string) => caso(id)?.candidato.nome ?? "Candidato";
   const mapa = new Map<string, Notificacao[]>();
   mapa.set(PERSONA_POR_PAPEL.ANALISTA.id, [
      n("nt-a1", "ATRIBUIDO", "c-demo-analise", "Caso atribuído a você", `${nome("c-demo-analise")} · Administração`, 35),
      n("nt-a2", "RESPOSTA_COORDENACAO", "c-demo-ajuste", "Coordenação respondeu", nome("c-demo-ajuste"), 70),
      n(
         "nt-a3",
         "MENCAO",
         "c-demo-coordenacao",
         "Você foi mencionada numa nota",
         "Prof. Eduardo Fontes: confira a ementa antes de responder",
         240,
         true,
      ),
   ]);
   mapa.set(PERSONA_POR_PAPEL.COORDENADOR.id, [
      n(
         "nt-c1",
         "PERGUNTA_COORDENACAO",
         "c-demo-coordenacao",
         "Perguntas da análise para você",
         `${nome("c-demo-coordenacao")} · Administração`,
         50,
      ),
   ]);
   mapa.set(PERSONA_POR_PAPEL.MATRICULA.id, [
      n("nt-m1", "ATRIBUIDO", "c-demo-matricula", "Pronto para matrícula", `${nome("c-demo-matricula")} · primeiro contato`, 20),
      n("nt-m2", "MENSAGEM_CANDIDATO", "c-demo-negociacao", "Candidato respondeu a proposta", nome("c-demo-negociacao"), 60),
   ]);
   mapa.set(PERSONA_POR_PAPEL.CONSULTOR.id, [
      n(
         "nt-k1",
         "MENCAO",
         "c-demo-documentos",
         "Você foi mencionado numa nota",
         "Juliana Prado: o candidato pediu ajuda com os planos de ensino",
         90,
      ),
   ]);
   const estourados = [...db.casos.values()].filter(c => c.flags.escalado).slice(0, 2);
   const gestao = estourados.map((c, i) =>
      n(`nt-d${i}`, "SLA_ESTOURADO", c.id, "Prazo da coordenação estourado", `${c.candidato.nome} · ${c.destino.cursoNome}`, 30 + i * 40),
   );
   mapa.set(PERSONA_POR_PAPEL.DIRETORIA.id, gestao);
   mapa.set(PERSONA_POR_PAPEL.ADMIN.id, gestao);
   mapa.set(PERSONA_POR_PAPEL.GESTAO.id, gestao);
   mapa.set(PERSONA_POR_PAPEL.SUPORTE.id, []);
   return mapa;
}

export function iniciarDb(agora: Date = new Date()): void {
   db.iniciadoEm = agora;
   db.casos = new Map(semearCasos(agora).map(c => [c.id, c]));
   db.analises.clear();
   db.analisesArquivadas.clear();
   db.documentos.clear();
   db.eventos.clear();
   db.notificacoes = notificacoesIniciais(agora);
   db.metas.clear();
}
