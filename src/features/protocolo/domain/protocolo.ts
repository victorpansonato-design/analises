/**
 * Regras puras do "Novo protocolo" (docs/05 §4, docs/03 ENVIAR_PROTOCOLO). Ficam fora do componente
 * para serem testadas e para o drawer só desenhar:
 *
 * - Máscara do CPF e do celular é só visual: o estado guarda dígitos.
 * - O vínculo detectado no lookup SUGERE o tipo (ex-aluno → Retorno; aluno ativo → Transferência
 *   interna) e diz o porquê; quem abre o protocolo pode trocar.
 * - Caso ativo do mesmo CPF no mesmo curso BLOQUEIA (guarda `semDuplicado` da máquina).
 * - IES e curso de origem só existem em externa e diploma; "estudou fora no período" só em retorno
 *   sem vínculo (decide se o caso pede documentos externos).
 */
import { lista } from "@/lib/format";

import {
   CICLOS_ATIVOS,
   precisaDocumentosExternos,
   ROTULO_TIPO_COMPLETO,
   type CasoResumo,
   type Curso,
   type Modalidade,
   type Tipo,
   type Turno,
} from "@/features/casos";

import type { ItemChecklist } from "@/features/documentos";
import {
   NovoProtocoloSchema,
   type LookupPessoa,
   type NovoProtocolo,
   type NovoProtocoloForm,
} from "@/features/protocolo/types/protocolo.schema";

/** Ciclo de ingresso dos novos protocolos: o ciclo atual de captação (parâmetro `CICLOS_ATIVOS`). */
export const CICLO_PROTOCOLO = CICLOS_ATIVOS[0];

// ── Máscaras (só exibição) ─────────────────────────────────────────────────────────────────────

export function somenteDigitos(valor: string, max: number): string {
   return valor.replace(/\D/g, "").slice(0, max);
}

/** `123` · `123.4` · `123.456.7` · `123.456.789-0` (progressiva, para digitar). */
export function mascaraCpf(digitos: string): string {
   const d = somenteDigitos(digitos, 11);
   if (d.length <= 3) return d;
   if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
   if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
   return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** `(11` · `(11) 9876` · `(11) 98765-4321` (progressiva). */
export function mascaraCelular(digitos: string): string {
   const d = somenteDigitos(digitos, 11);
   if (d.length === 0) return "";
   if (d.length <= 2) return `(${d}`;
   const ddd = d.slice(0, 2);
   const resto = d.slice(2);
   if (resto.length <= 4) return `(${ddd}) ${resto}`;
   const corte = d.length === 11 ? 5 : 4;
   return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

// ── Vínculo e tipo ─────────────────────────────────────────────────────────────────────────────

export interface SugestaoTipo {
   tipo: Tipo;
   porque: string;
}

/** Tipo sugerido pelo vínculo encontrado no CPF, com a frase do porquê. `null` sem vínculo. */
export function sugerirTipo(lookup: Pick<LookupPessoa, "vinculo" | "tipoSugerido" | "pessoa">): SugestaoTipo | null {
   const ra = lookup.pessoa?.ra ? ` (RA ${lookup.pessoa.ra})` : "";
   switch (lookup.vinculo) {
      case "ALUNO_ATIVO":
         return {
            tipo: lookup.tipoSugerido ?? "TRANSFERENCIA_INTERNA",
            porque: `É aluno ativo da UniAnchieta${ra}: mudar de curso é transferência interna; dispensar disciplinas cursadas fora é aproveitamento de estudos.`,
         };
      case "EX_ALUNO":
         return { tipo: lookup.tipoSugerido ?? "RETORNO", porque: `Já estudou na UniAnchieta${ra}: voltar é retorno ao curso.` };
      case "FORMADO":
         return {
            tipo: lookup.tipoSugerido ?? "PORTADOR_DIPLOMA",
            porque: `Já se formou na UniAnchieta${ra}: um novo curso entra como portador de diploma.`,
         };
      default:
         return lookup.tipoSugerido
            ? { tipo: lookup.tipoSugerido, porque: `Sugestão do cadastro: ${ROTULO_TIPO_COMPLETO[lookup.tipoSugerido].toLowerCase()}.` }
            : null;
   }
}

/** Caso ativo do mesmo CPF no mesmo curso de destino: bloqueia o protocolo. */
export function casoDuplicado(lookup: Pick<LookupPessoa, "casosAtivos"> | null | undefined, cursoId: string): CasoResumo | null {
   if (!lookup || !cursoId) return null;
   return lookup.casosAtivos.find(c => c.destino.cursoId === cursoId) ?? null;
}

/** Outros casos ativos (curso diferente): só aviso, não bloqueia. */
export function outrosCasosAtivos(lookup: Pick<LookupPessoa, "casosAtivos"> | null | undefined, cursoId: string): CasoResumo[] {
   if (!lookup) return [];
   return lookup.casosAtivos.filter(c => c.destino.cursoId !== cursoId);
}

// ── Campos condicionais ────────────────────────────────────────────────────────────────────────

/** Instituição de origem: onde o candidato estudou (no aproveitamento, onde cursou as disciplinas). */
export function mostraOrigem(tipo: Tipo): boolean {
   return tipo === "TRANSFERENCIA_EXTERNA" || tipo === "PORTADOR_DIPLOMA" || tipo === "APROVEITAMENTO_ESTUDOS";
}

export function mostraSubtipo(tipo: Tipo): boolean {
   return tipo === "RETORNO";
}

export function mostraEstudouFora(tipo: Tipo, subtipo: NovoProtocoloForm["subtipo"]): boolean {
   return tipo === "RETORNO" && subtipo === "SEM_VINCULO";
}

/** Turno/modalidade válidos para o curso; uma opção só já vem escolhida. */
export function ajustarDestino(
   curso: Pick<Curso, "turnos" | "modalidades"> | undefined,
   turno: Turno | null,
   modalidade: Modalidade | null,
) {
   if (!curso) return { turno: null, modalidade: null };
   const t = turno && curso.turnos.includes(turno) ? turno : curso.turnos.length === 1 ? curso.turnos[0] : null;
   const m =
      modalidade && curso.modalidades.includes(modalidade) ? modalidade : curso.modalidades.length === 1 ? curso.modalidades[0] : null;
   return { turno: t, modalidade: m };
}

// ── O que vai acontecer ────────────────────────────────────────────────────────────────────────

export function oQueVaiAcontecer(v: Pick<NovoProtocoloForm, "tipo" | "subtipo" | "estudouForaNoPeriodo" | "optInWhatsapp">): string {
   const estudouFora = mostraEstudouFora(v.tipo, v.subtipo) ? v.estudouForaNoPeriodo === true : null;
   if (!precisaDocumentosExternos({ tipo: v.tipo, estudouForaNoPeriodo: estudouFora })) {
      return "Não há documento externo para pedir: a pré-análise começa sozinha com o histórico interno. Você será avisado se precisar agir.";
   }
   return v.optInWhatsapp
      ? "Vamos enviar ao candidato, pelo WhatsApp, a lista de documentos. Você será avisado se precisar agir."
      : "Sem autorização para WhatsApp, nenhuma mensagem sai: peça a lista de documentos ao candidato por outro canal. Você será avisado se precisar agir.";
}

// ── Payload ────────────────────────────────────────────────────────────────────────────────────

/** Monta e valida o corpo do `POST /casos` a partir do formulário (já validado pelo RHF). */
export function montarNovoProtocolo(v: NovoProtocoloForm, curso: Pick<Curso, "id" | "nome">, ciclo = CICLO_PROTOCOLO): NovoProtocolo {
   if (!v.turno || !v.modalidade) throw new Error("Turno e modalidade são obrigatórios");
   const origem = mostraOrigem(v.tipo);
   return NovoProtocoloSchema.parse({
      cpf: somenteDigitos(v.cpf, 11),
      nome: v.nome.trim().replace(/\s+/g, " "),
      celular: somenteDigitos(v.celular, 11),
      email: v.email.trim() || null,
      optInWhatsapp: v.optInWhatsapp,
      tipo: v.tipo,
      subtipo: mostraSubtipo(v.tipo) ? v.subtipo : null,
      estudouForaNoPeriodo: mostraEstudouFora(v.tipo, v.subtipo) ? v.estudouForaNoPeriodo === true : null,
      destino: { cursoId: curso.id, cursoNome: curso.nome, turno: v.turno, modalidade: v.modalidade, matrizId: null, ciclo },
      origem: {
         iesId: origem ? (v.iesId ?? null) : null,
         iesNome: origem ? v.iesNome.trim() || null : null,
         cursoNome: origem ? v.cursoOrigemNome.trim() || null : null,
      },
      enviar: true,
   });
}

// ── Rascunho e documentos ──────────────────────────────────────────────────────────────────────

export const FORM_VAZIO: NovoProtocoloForm = {
   cpf: "",
   nome: "",
   celular: "",
   email: "",
   optInWhatsapp: true,
   tipo: "TRANSFERENCIA_EXTERNA",
   subtipo: null,
   estudouForaNoPeriodo: null,
   cursoId: "",
   turno: null,
   modalidade: null,
   iesId: null,
   iesNome: "",
   cursoOrigemNome: "",
};

/** O rascunho só vale a pena guardar quando alguém já digitou algo. */
export function rascunhoTemConteudo(v: Partial<NovoProtocoloForm> | null | undefined): boolean {
   if (!v) return false;
   return !!(v.cpf || v.nome?.trim() || v.celular || v.email?.trim() || v.cursoId || v.iesNome?.trim());
}

/** Próximo item ainda pendente do checklist para anexar um arquivo (ignora os já usados). */
export function proximoChecklistPendente(
   itens: readonly Pick<ItemChecklist, "id" | "status">[],
   usados: ReadonlySet<string>,
): string | null {
   const livre = itens.find(i => (i.status === "PENDENTE" || i.status === "RECUSADO") && !usados.has(i.id));
   return livre?.id ?? null;
}

export function resumoFalhasUpload(nomes: readonly string[]): string {
   return nomes.length === 1 ? `O arquivo ${nomes[0]} não foi anexado.` : `Os arquivos ${lista(nomes)} não foram anexados.`;
}
