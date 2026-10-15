/**
 * Análise curricular simulada: histórico de origem coerente com a matriz de destino, sugestões
 * da pré-análise (IA + base de equivalências) e decisões coerentes com a etapa do caso. O resumo é
 * calculado aqui como o backend calcularia (docs/06 §6), com os parâmetros de `REGRAS_ANALISE`.
 */
import type { Analise, ItemAnalise, ItemOrigem, ResumoAnalise, Sugestao } from "@/features/analise";
import { IA, REGRAS_ANALISE, type DecisaoItem } from "@/features/casos";

import { criarPrng, type Prng } from "@/mocks/lib/prng";
import type { AnaliseRegistro, CasoRegistro } from "@/mocks/db/tipos";
import { IES_FICTICIAS, cursoPorId, disciplinasDaMatriz, ementa, matrizPorId, type DisciplinaMatriz } from "@/mocks/seed/cursos";
import { resumoUsuario } from "@/mocks/seed/usuarios";

const EXTRAS_ORIGEM = [
   "Cultura brasileira",
   "Inglês instrumental",
   "Educação física",
   "Responsabilidade social",
   "Língua espanhola",
   "Tópicos especiais",
   "Filosofia",
];

const PERGUNTAS = [
   "A ementa da origem cobre só parte do conteúdo. Dispensa ou adaptação?",
   "CH da origem abaixo do mínimo. Aceitamos com complementação?",
   "Disciplina cursada há mais de cinco anos. Há prazo de validade para dispensa?",
   "Nome diferente, mas o plano de ensino parece equivalente. Confirmam a dispensa?",
];

function variante(nome: string, r: Prng): string {
   return r.weighted([
      [nome, 5],
      [`${nome} aplicada`, 1],
      [`Introdução a ${nome.toLowerCase()}`, 1],
      [`Tópicos de ${nome.toLowerCase()}`, 1],
   ] as const);
}

function disciplinasDaMatrizId(matrizId: string): DisciplinaMatriz[] {
   const m = matrizPorId(matrizId);
   if (!m) return [];
   const todas = disciplinasDaMatriz(m.cursoId);
   // A matriz anterior tem duas disciplinas a menos (para "Trocar matriz" ter impacto visível).
   return m.vigente ? todas : todas.filter((_, i) => i % 19 !== 7);
}

/** Histórico de origem: externo (outra IES) ou interno (interna/retorno). */
function gerarOrigem(caso: CasoRegistro, disciplinas: DisciplinaMatriz[], r: Prng): ItemOrigem[] {
   const curso = cursoPorId(caso.destino.cursoId);
   const interno = caso.tipo === "TRANSFERENCIA_INTERNA" || caso.tipo === "RETORNO";
   const diploma = caso.tipo === "PORTADOR_DIPLOMA";
   const periodosCursados = caso.roteiro === "ANALISE_45" ? 4 : r.int(2, Math.min(6, curso.periodos - 1));
   const ies = interno ? "UniAnchieta" : caso.origem.iesNome;
   const origem: ItemOrigem[] = [];
   let n = 0;
   for (const d of disciplinas) {
      const cursou = diploma ? r.chance(0.35) : d.periodo !== null && d.periodo <= periodosCursados && r.chance(interno ? 0.95 : 0.85);
      if (!cursou) continue;
      n++;
      const fator = interno
         ? 1
         : r.weighted([
              [1, 6],
              [1.25, 2],
              [0.8, 2],
              [0.66, 1.4],
              [0.5, 0.6],
           ] as const);
      const ano = 2027 - Math.ceil((periodosCursados - (d.periodo ?? 1) + 1) / 2) - (diploma ? r.int(2, 8) : 0);
      origem.push({
         id: `o${n}`,
         nome: interno ? d.nome : variante(d.nome, r),
         ies,
         ch: Math.round(d.ch * fator),
         nota: r.chance(0.92) ? Math.round((6 + r.next() * 4) * 10) / 10 : Math.round((2 + r.next() * 3.5) * 10) / 10,
         ano,
         semestre: r.int(1, 2),
         situacao: "APROVADO",
         confiancaExtracao: interno ? 1 : Math.round((0.62 + r.next() * 0.38) * 100) / 100,
         usadaEm: [],
      });
   }
   for (const o of origem) if (o.nota !== null && o.nota < 5) o.situacao = "REPROVADO";
   const extrasDe = segundoHistorico(caso, ies, interno);
   if (!interno) {
      const extras = r.shuffle(EXTRAS_ORIGEM).slice(0, r.int(2, 5));
      for (const nome of extras) {
         n++;
         origem.push({
            id: `o${n}`,
            nome,
            ies: extrasDe ?? ies,
            ch: r.pick([40, 60, 80]),
            nota: 7.5,
            ano: 2025,
            semestre: 1,
            situacao: "APROVADO",
            confiancaExtracao: 0.95,
            usadaEm: [],
         });
      }
   }
   // Parte das disciplinas cursadas também veio do segundo histórico (a conferência troca de aba sozinha).
   if (extrasDe) {
      const r2 = criarPrng(`segundo-historico-itens-${caso.id}`);
      for (const o of origem) if (o.ies === ies && r2.chance(0.25)) o.ies = extrasDe;
   }
   // Códigos como no histórico de cada instituição (sigla + sequência): só leitura, para conferência.
   const seq = new Map<string, number>();
   for (const o of origem) {
      const chaveIes = o.ies ?? "origem";
      const k = (seq.get(chaveIes) ?? 0) + 1;
      seq.set(chaveIes, k);
      o.codigo = `${siglaDe(chaveIes)}${String(100 + k * 3).padStart(4, "0")}`;
   }
   return origem;
}

function siglaDe(ies: string): string {
   const conhecida = IES_FICTICIAS.find(i => i.nome === ies)?.sigla;
   if (conhecida) return conhecida;
   if (ies === "UniAnchieta") return "UNA";
   return ies
      .split(/\s+/)
      .filter(p => p.length > 2)
      .map(p => p[0]?.toUpperCase())
      .join("")
      .slice(0, 4);
}

/**
 * Parte dos casos tem um segundo histórico (disciplinas avulsas em outra instituição fictícia), para
 * a conferência lado a lado ter abas. PRNG próprio: não muda nada do que a semente já gerava.
 */
function segundoHistorico(caso: CasoRegistro, ies: string | null, interno: boolean): string | null {
   if (interno) return null;
   const r = criarPrng(`segundo-historico-${caso.id}`);
   if (caso.roteiro !== "ANALISE_45" && !r.chance(0.4)) return null;
   const outras = IES_FICTICIAS.filter(i => i.nome !== ies);
   return outras[Math.floor(r.next() * outras.length)]?.nome ?? null;
}

function chave(nome: string): string {
   return nome
      .toLowerCase()
      .replace(/^(introdução a|tópicos de) /, "")
      .replace(/ aplicada$/, "");
}

/** Sugestão da pré-análise para um item (IA ou regra de equivalência). */
function sugerir(d: DisciplinaMatriz, origem: ItemOrigem[], interno: boolean, r: Prng): Sugestao | null {
   const par = origem.find(o => chave(o.nome) === d.nome.toLowerCase());
   if (!par) {
      return r.chance(0.92)
         ? {
              decisao: "REGULAR",
              origemIds: [],
              confianca: "ALTA",
              fonte: "IA",
              justificativa: "Sem disciplina correspondente na origem.",
              alertas: [],
           }
         : null;
   }
   const razao = par.ch / d.ch;
   const minimo = REGRAS_ANALISE.chMinimaPercentual;
   if (par.situacao === "REPROVADO") {
      return {
         decisao: "REGULAR",
         origemIds: [par.id],
         confianca: "MEDIA",
         fonte: "IA",
         justificativa: "Reprovação na origem.",
         alertas: ["Nota abaixo da média de aprovação"],
      };
   }
   if (razao < minimo) {
      return {
         decisao: razao >= 0.5 ? "ADAP" : "REGULAR",
         origemIds: [par.id],
         confianca: razao >= 0.5 ? "MEDIA" : "BAIXA",
         fonte: "IA",
         justificativa: `CH da origem abaixo do mínimo (${par.ch} h ÷ ${d.ch} h).`,
         alertas: [`CH ${Math.round(razao * 100)}% da exigida`],
      };
   }
   const regra = interno || r.chance(0.28);
   const nomeIgual = par.nome.toLowerCase() === d.nome.toLowerCase();
   const confExtracao = par.confiancaExtracao ?? 1;
   return {
      decisao: "DISPENSA",
      origemIds: [par.id],
      confianca: regra ? "REGRA" : nomeIgual && confExtracao >= IA.limiarAlta ? "ALTA" : "MEDIA",
      fonte: regra ? "REGRA" : "IA",
      justificativa: regra ? "Equivalência registrada pela coordenação." : `Conteúdo e CH compatíveis (${par.ch} h ÷ ${d.ch} h).`,
      alertas: confExtracao < IA.conferirExtracaoAbaixo ? ["Extração com baixa confiança: confira CH e nota no histórico"] : [],
   };
}

function decidir(item: ItemAnalise, por: string | null, em: string, valor?: DecisaoItem): void {
   const usuario = resumoUsuario(por) ?? { id: "u-sistema", nome: "Sistema" };
   const v = valor ?? item.sugestao?.decisao ?? "REGULAR";
   item.estado = "DECIDIDO";
   item.decisao = {
      valor: v,
      origemIds: v === "DISPENSA" ? (item.sugestao?.origemIds ?? []) : [],
      origem: item.sugestao && item.sugestao.decisao === v ? item.sugestao.fonte : "ANALISTA",
      motivoAlteracao: null,
      por: usuario,
      em,
   };
}

function perguntar(item: ItemAnalise, por: string | null, em: string, r: Prng): void {
   const usuario = resumoUsuario(por) ?? { id: "u-sistema", nome: "Sistema" };
   item.estado = "PERGUNTA_ABERTA";
   item.decisao = null;
   item.pergunta = { texto: r.pick(PERGUNTAS), decisaoSugerida: item.sugestao?.decisao ?? "DISPENSA", por: usuario, em, resposta: null };
}

function responder(item: ItemAnalise, coordId: string | null, em: string): void {
   if (!item.pergunta) return;
   const coord = resumoUsuario(coordId) ?? { id: "u-coo", nome: "Coordenação" };
   const decisao = item.pergunta.decisaoSugerida;
   item.pergunta.resposta = {
      decisao,
      comentario: "Conteúdo equivalente. Pode seguir com a sugestão.",
      usarComoRegra: true,
      por: coord,
      em,
   };
   item.estado = "RESPONDIDO";
   item.decisao = {
      valor: decisao,
      origemIds: decisao === "DISPENSA" ? (item.sugestao?.origemIds ?? []) : [],
      origem: "COORDENACAO",
      motivoAlteracao: null,
      por: coord,
      em,
   };
}

/** Roteiro da analista: 45 itens, 32 sugestões de alta confiança, 9 para julgar e 4 já decididos. */
function ajustarRoteiro45(itens: ItemAnalise[], analistaId: string | null, em: string): void {
   const comPeriodo = itens.filter(i => i.periodo === 1).slice(0, 4);
   for (const i of comPeriodo) {
      if (!i.sugestao)
         i.sugestao = {
            decisao: "REGULAR",
            origemIds: [],
            confianca: "ALTA",
            fonte: "IA",
            justificativa: "Sem disciplina correspondente na origem.",
            alertas: [],
         };
      decidir(i, analistaId, em);
   }
   const resto = itens.filter(i => !comPeriodo.includes(i));
   const alta = (i: ItemAnalise) => i.sugestao?.confianca === "ALTA" || i.sugestao?.confianca === "REGRA";
   let altas = resto.filter(alta);
   const baixas = resto.filter(i => !alta(i));
   while (altas.length > 32) {
      const i = altas.pop() as ItemAnalise;
      i.sugestao = {
         ...(i.sugestao as Sugestao),
         confianca: "MEDIA",
         alertas: ["Nomes parecidos, conteúdos podem divergir: confira a ementa"],
      };
      baixas.push(i);
   }
   while (altas.length < 32 && baixas.length > 9) {
      const i = baixas.shift() as ItemAnalise;
      i.sugestao = i.sugestao
         ? { ...i.sugestao, confianca: "ALTA", alertas: [] }
         : {
              decisao: "REGULAR",
              origemIds: [],
              confianca: "ALTA",
              fonte: "IA",
              justificativa: "Sem disciplina correspondente na origem.",
              alertas: [],
           };
      altas = resto.filter(alta);
   }
   baixas.forEach((i, idx) => {
      if (!i.sugestao)
         i.sugestao = {
            decisao: "REGULAR",
            origemIds: [],
            confianca: "BAIXA",
            fonte: "IA",
            justificativa: "Correspondência fraca: confira a ementa.",
            alertas: [],
         };
      if (idx < 4 && !(i.sugestao.alertas?.length ?? 0)) i.sugestao = { ...i.sugestao, alertas: ["Conteúdo possivelmente divergente"] };
   });
}

export function gerarAnalise(caso: CasoRegistro, matrizId: string, agora: Date): AnaliseRegistro {
   const r = criarPrng(`${caso.semente}-${matrizId}`);
   const disciplinas = disciplinasDaMatrizId(matrizId);
   const origem = gerarOrigem(caso, disciplinas, r);
   const interno = caso.tipo === "TRANSFERENCIA_INTERNA" || caso.tipo === "RETORNO";
   const falhou = caso.flags.preAnaliseFalhou;
   const itens: ItemAnalise[] = disciplinas.map(d => ({
      id: d.id,
      periodo: d.periodo,
      disciplina: d.nome,
      codigo: d.codigo,
      ch: d.ch,
      estado: "SUGERIDO",
      sugestao: falhou ? null : sugerir(d, origem, interno, r),
      decisao: null,
      pergunta: null,
      ementa: ementa(d.nome),
   }));

   const analista = caso.responsaveis.analistaId;
   const quando = (h: number) => new Date(agora.getTime() - h * 3600_000).toISOString();
   const etapa = caso.etapa;
   const passou = (e: string) => caso.jornada.some(p => p.etapa === e);

   if (caso.roteiro === "ANALISE_45") {
      ajustarRoteiro45(itens, analista, quando(2));
   } else if (etapa === "EM_ANALISE" && !falhou) {
      for (const i of itens)
         if ((i.sugestao?.confianca === "REGRA" || i.sugestao?.confianca === "ALTA") && r.chance(0.3))
            decidir(i, analista, quando(r.int(1, 6)));
   } else if (etapa !== "EM_ANALISE" && etapa !== "PRE_ANALISE" && etapa !== "AGUARDANDO_DOCUMENTOS" && etapa !== "RASCUNHO") {
      for (const i of itens) decidir(i, analista, quando(r.int(20, 90)));
      if (etapa === "AGUARDANDO_COORDENACAO" || etapa === "AJUSTE_POS_COORDENACAO" || passou("AGUARDANDO_COORDENACAO")) {
         const candidatos = itens.filter(i => i.sugestao && i.sugestao.confianca !== "REGRA" && i.periodo !== null);
         const qtd = caso.roteiro === "COORDENACAO_2" || caso.roteiro === "AJUSTE" ? 2 : r.int(1, 3);
         for (const i of r.shuffle(candidatos).slice(0, qtd)) {
            perguntar(i, analista, quando(r.int(4, 20)), r);
            if (etapa !== "AGUARDANDO_COORDENACAO") responder(i, caso.responsaveis.coordenadorId, quando(r.int(1, 3)));
         }
      }
   }

   const curso = cursoPorId(caso.destino.cursoId);
   const atividades =
      etapa === "AGUARDANDO_DOCUMENTOS"
         ? []
         : Array.from({ length: r.int(0, 3) }, (_, i) => ({
              id: `ac${i + 1}`,
              atividade: r.pick(["Curso livre de extensão", "Monitoria", "Congresso acadêmico", "Voluntariado", "Iniciação científica"]),
              ch: r.pick([10, 20, 30, 40, 60]),
              ano: 2025,
              periodo: r.int(1, 2),
              inicio: null,
              fim: null,
           }));
   const pratica =
      etapa === "AGUARDANDO_DOCUMENTOS"
         ? []
         : r.chance(0.4)
           ? [{ id: "pe1", descricao: "Projeto de extensão na IES de origem", ch: r.pick([40, 60, 80]) }]
           : [];

   const reg: AnaliseRegistro = {
      matrizId,
      itens,
      origem,
      atividades,
      pratica,
      personalizadas: curso.personalizadasPos.map((nome, i) => ({ id: `pos${i + 1}`, nome })),
      periodoIngresso: null,
      versao: 1,
   };
   atualizarUsoOrigem(reg);
   const concluida = ![
      "EM_ANALISE",
      "AGUARDANDO_COORDENACAO",
      "AJUSTE_POS_COORDENACAO",
      "PRE_ANALISE",
      "AGUARDANDO_DOCUMENTOS",
      "RASCUNHO",
   ].includes(etapa);
   if (concluida) reg.periodoIngresso = periodoSugerido(reg) ?? 1;
   return reg;
}

/** Recalcula `usadaEm` de cada disciplina de origem a partir das decisões (ou sugestões pendentes). */
export function atualizarUsoOrigem(a: AnaliseRegistro): void {
   for (const o of a.origem) o.usadaEm = [];
   for (const i of a.itens) {
      const ids = i.decisao
         ? i.decisao.valor === "DISPENSA"
            ? i.decisao.origemIds
            : []
         : i.sugestao?.decisao === "DISPENSA"
           ? i.sugestao.origemIds
           : [];
      for (const id of ids) a.origem.find(o => o.id === id)?.usadaEm.push(i.id);
   }
}

function decisaoEfetiva(i: ItemAnalise): DecisaoItem | null {
   return i.decisao?.valor ?? i.sugestao?.decisao ?? null;
}

/** Ingresso sugerido [HIPÓTESE de heurística, docs/06 §6]: avança enquanto o período está majoritariamente dispensado. */
export function periodoSugerido(a: AnaliseRegistro): number | null {
   const m = matrizPorId(a.matrizId);
   if (!m) return null;
   let p = 1;
   for (let periodo = 1; periodo <= m.periodos; periodo++) {
      const doPeriodo = a.itens.filter(i => i.periodo === periodo);
      const ch = doPeriodo.reduce((s, i) => s + i.ch, 0);
      const dispensada = doPeriodo.filter(i => decisaoEfetiva(i) === "DISPENSA").reduce((s, i) => s + i.ch, 0);
      if (ch > 0 && dispensada / ch >= 0.6) p = periodo + 1;
      else break;
   }
   return Math.min(p, m.periodos);
}

export function decidido(i: ItemAnalise): boolean {
   return i.estado === "DECIDIDO" || i.estado === "RESPONDIDO";
}

export function origemRepetida(a: AnaliseRegistro): { origemId: string; itemId: string } | null {
   if (REGRAS_ANALISE.permitirOrigemRepetida) return null;
   const uso = new Map<string, string[]>();
   for (const i of a.itens) {
      if (!decidido(i) || i.decisao?.valor !== "DISPENSA") continue;
      for (const id of i.decisao.origemIds) uso.set(id, [...(uso.get(id) ?? []), i.id]);
   }
   for (const [origemId, itens] of uso) if (itens.length > 1) return { origemId, itemId: itens[1] };
   return null;
}

export function calcularResumo(a: AnaliseRegistro): ResumoAnalise {
   const m = matrizPorId(a.matrizId);
   const decididos = a.itens.filter(decidido);
   const conta = (v: DecisaoItem) => decididos.filter(i => i.decisao?.valor === v).length;
   const pendentes = a.itens.filter(i => !decidido(i));
   const perguntas = a.itens.filter(i => i.estado === "PERGUNTA_ABERTA");
   const sugerido = periodoSugerido(a);
   const periodo = a.periodoIngresso ?? sugerido;
   const dpAdap = conta("DP") + conta("ADAP");
   const restantes = m && periodo ? m.periodos - periodo + 1 : null;
   const extra =
      restantes === null
         ? 0
         : Math.ceil(Math.max(0, dpAdap - restantes * REGRAS_ANALISE.dpAdapPorSemestre) / REGRAS_ANALISE.dpAdapPorSemestre);
   const acimaDoLimite = a.atividades.filter(x => x.ch > REGRAS_ANALISE.atividadeComplementarMaxHoras);
   const repetida = origemRepetida(a);

   const bloqueios: ResumoAnalise["bloqueios"] = [];
   if (pendentes.length - perguntas.length > 0) {
      const n = pendentes.length - perguntas.length;
      bloqueios.push({
         mensagem: n === 1 ? "1 disciplina sem decisão" : `${n} disciplinas sem decisão`,
         itemId: pendentes.find(i => i.estado !== "PERGUNTA_ABERTA")?.id ?? null,
      });
   }
   for (const p of perguntas) bloqueios.push({ mensagem: `Pergunta aberta: ${p.disciplina}`, itemId: p.id });
   if (a.periodoIngresso === null) bloqueios.push({ mensagem: "Defina o período de ingresso", itemId: null });
   for (const x of acimaDoLimite)
      bloqueios.push({
         mensagem: `${x.atividade}: ${x.ch} h, acima do limite de ${REGRAS_ANALISE.atividadeComplementarMaxHoras} h`,
         itemId: null,
      });
   if (repetida) bloqueios.push({ mensagem: "Uma disciplina de origem sustenta mais de uma dispensa", itemId: repetida.itemId });

   return {
      chTotalMatriz: a.itens.reduce((s, i) => s + i.ch, 0),
      chDispensada: decididos.filter(i => i.decisao?.valor === "DISPENSA").reduce((s, i) => s + i.ch, 0),
      contagem: {
         dispensa: conta("DISPENSA"),
         regular: conta("REGULAR"),
         dp: conta("DP"),
         adap: conta("ADAP"),
         pendentes: pendentes.length,
         perguntas: perguntas.length,
      },
      periodoIngressoSugerido: sugerido,
      periodoIngresso: a.periodoIngresso,
      previsaoSemestres: restantes === null ? null : restantes + extra,
      atividadesComplementares: { horas: a.atividades.reduce((s, x) => s + x.ch, 0), exigidas: m?.atividadesComplementaresExigidas ?? 0 },
      praticaExtensionista: { horas: a.pratica.reduce((s, x) => s + x.ch, 0), exigidas: m?.praticaExtensionistaExigida ?? 0 },
      bloqueios,
   };
}

export function montarAnalise(a: AnaliseRegistro): Analise {
   const m = matrizPorId(a.matrizId);
   if (!m) throw new Error(`Matriz desconhecida: ${a.matrizId}`);
   return {
      matriz: m,
      itens: a.itens,
      origem: a.origem,
      atividadesComplementares: a.atividades,
      praticaExtensionista: a.pratica,
      disciplinasPersonalizadasPos: a.personalizadas,
      resumo: calcularResumo(a),
      versao: a.versao,
   };
}

export function contadoresDaAnalise(a: AnaliseRegistro | null) {
   if (!a) return { itensMatriz: 0, itensSemDecisao: 0, perguntasAbertas: 0 };
   return {
      itensMatriz: a.itens.length,
      itensSemDecisao: a.itens.filter(i => !decidido(i)).length,
      perguntasAbertas: a.itens.filter(i => i.estado === "PERGUNTA_ABERTA").length,
   };
}

export function cobertura(a: AnaliseRegistro): { sugeridos: number; total: number } {
   return { sugeridos: a.itens.filter(i => i.sugestao).length, total: a.itens.length };
}
