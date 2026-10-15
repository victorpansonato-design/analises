/** Relatório completo e independente dos filtros e da moldura do app. Notas internas não são exportadas. */
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import logoAnchieta from "@/assets/images/grupo-anchieta.png";
import { ROTULO_DECISAO, ROTULO_MODALIDADE, ROTULO_TIPO_COMPLETO, ROTULO_TURNO, type CasoDetalhe } from "@/features/casos";
import { decimal, fullDate, horas, int, ordinal, percent, plural, time } from "@/lib/format";
import { agruparPorPeriodo, aproveitamento, tituloPeriodo } from "@/features/analise/domain/analise.domain";
import { resumoEletivas } from "@/features/analise/domain/eletivas";
import { itemDecidido, type Analise, type ItemOrigem } from "@/features/analise/types/analise.schema";
import "./impressao-analise.css";

function Dado({ titulo, children, destaque = false }: { titulo: string; children: ReactNode; destaque?: boolean }) {
   return (
      <div className={destaque ? "relatorio-dado relatorio-aluno" : "relatorio-dado"}>
         <dt>{titulo}</dt>
         <dd>{children}</dd>
      </div>
   );
}

function HorasComplementares({
   titulo,
   tom,
   horas: creditadas,
   exigidas,
}: {
   titulo: string;
   tom: string;
   horas: number;
   exigidas: number;
}) {
   return (
      <div className="relatorio-horas" data-tom={tom}>
         <h3>{titulo}</h3>
         <p className="relatorio-horas-valor">{horas(creditadas)}</p>
         <p>registradas de {horas(exigidas)} exigidas</p>
         <p className="relatorio-horas-restantes">{horas(Math.max(0, exigidas - creditadas))} a cumprir</p>
      </div>
   );
}

export function ImpressaoAnalise({
   caso,
   analise,
   origemPorId,
}: {
   caso: CasoDetalhe;
   analise: Analise;
   origemPorId: ReadonlyMap<string, ItemOrigem>;
}) {
   const r = analise.resumo;
   const grupos = agruparPorPeriodo(analise.itens);
   const eletivas = resumoEletivas(analise.itens);
   const emitidoEm = new Date();
   return createPortal(
      <article className="relatorio-analise" aria-label="Relatório da análise curricular">
         <header className="relatorio-cabecalho">
            <div className="relatorio-marca">
               <img src={logoAnchieta} alt="Grupo Anchieta" width={385} height={137} />
               <div>
                  <strong>Central acadêmica</strong>
                  <span>Análise curricular</span>
               </div>
            </div>
            <div className="relatorio-emissao">
               <strong>{caso.protocolo}</strong>
               <span>
                  Emitido em {fullDate(emitidoEm)} às {time(emitidoEm)}
               </span>
               <span>Versão {int(analise.versao)}</span>
            </div>
         </header>

         <section className="relatorio-identidade">
            <h1>Análise de aproveitamento</h1>
            <p className="relatorio-tipo">{ROTULO_TIPO_COMPLETO[caso.tipo]}</p>
            <dl>
               <Dado titulo="Aluno" destaque>
                  {caso.candidato.nome}
               </Dado>
               <Dado titulo="RA">{caso.candidato.ra ?? "Não informado"}</Dado>
               <Dado titulo="Curso" destaque>
                  {caso.destino.cursoNome}
               </Dado>
               <Dado titulo="Modalidade / turno">
                  {ROTULO_MODALIDADE[caso.destino.modalidade]} · {ROTULO_TURNO[caso.destino.turno]}
               </Dado>
               <Dado titulo="Matriz curricular">{analise.matriz.codigo}</Dado>
               <Dado titulo="Ciclo de ingresso">{caso.destino.ciclo}</Dado>
               <Dado titulo="Período de ingresso">
                  {r.periodoIngresso === null ? "Não confirmado" : ordinal(r.periodoIngresso) + " período"}
               </Dado>
               <Dado titulo="Instituição de origem" destaque>
                  {caso.origem.iesNome ?? "Não informada"}
               </Dado>
            </dl>
            <p className="relatorio-aviso">
               <strong>Apenas para consulta rápida.</strong> Este documento está sujeito a alterações. Consulte a análise atualizada no
               sistema.
            </p>
         </section>

         <section className="relatorio-resumo" aria-label="Resumo das decisões">
            <div>
               <strong>{horas(r.chDispensada)}</strong>
               <span>dispensadas de {horas(r.chTotalMatriz)}</span>
               <small>{percent(aproveitamento(r.chDispensada, r.chTotalMatriz))} de aproveitamento</small>
            </div>
            <div>
               <strong>{int(r.contagem.dispensa)}</strong>
               <span>Dispensas</span>
            </div>
            <div>
               <strong>{int(r.contagem.regular)}</strong>
               <span>Regulares</span>
            </div>
            <div>
               <strong>{int(r.contagem.dp + r.contagem.adap)}</strong>
               <span>DP / adaptações</span>
            </div>
         </section>

         <section className="relatorio-grade" aria-label="Disciplinas por período">
            <h2>Disciplinas e aproveitamentos</h2>
            <p className="relatorio-legenda">CH: carga horária · DP: dependência · ADAP: adaptação.</p>
            {grupos.map(g => (
               <table key={g.chave} className="relatorio-tabela">
                  <caption>
                     {tituloPeriodo(g.periodo)} <span>· {plural(g.itens.length, "disciplina", "disciplinas")}</span>
                  </caption>
                  <colgroup>
                     <col className="relatorio-col-disciplina" />
                     <col className="relatorio-col-ch" />
                     <col className="relatorio-col-origem" />
                     <col className="relatorio-col-decisao" />
                  </colgroup>
                  <thead>
                     <tr>
                        <th scope="col">Disciplina de destino</th>
                        <th scope="col">CH</th>
                        <th scope="col">Disciplina de origem / nota</th>
                        <th scope="col">Decisão</th>
                     </tr>
                  </thead>
                  <tbody>
                     {g.itens.map(i => {
                        // Nunca usar origens de uma sugestão como equivalência confirmada.
                        const origens = itemDecidido(i)
                           ? (i.decisao?.origemIds ?? []).flatMap(id => {
                                const origem = origemPorId.get(id);
                                return origem ? [origem] : [];
                             })
                           : [];
                        const decisao = itemDecidido(i) ? i.decisao?.valor : undefined;
                        return (
                           <tr key={i.id}>
                              <td>{i.disciplina}</td>
                              <td className="relatorio-numero">{horas(i.ch)}</td>
                              <td>
                                 {origens.length ? (
                                    <ul>
                                       {origens.map(o => (
                                          <li key={o.id}>
                                             {o.nome}
                                             <span className="relatorio-origem-dados">
                                                {horas(o.ch)} · Nota {o.nota === null ? "não informada" : decimal(o.nota, 2)}
                                                {o.ano === null ? "" : " · " + o.ano + (o.semestre === null ? "" : "/" + o.semestre)}
                                             </span>
                                          </li>
                                       ))}
                                    </ul>
                                 ) : (
                                    <span className="relatorio-sem-origem">—</span>
                                 )}
                              </td>
                              <td>
                                 {decisao ? (
                                    <span className="relatorio-decisao" data-decisao={decisao}>
                                       {ROTULO_DECISAO[decisao]}
                                    </span>
                                 ) : null}
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            ))}
         </section>

         <section className="relatorio-final">
            <h2>Cargas horárias complementares</h2>
            <div className="relatorio-cargas">
               <HorasComplementares titulo="Atividades complementares" tom="complementares" {...r.atividadesComplementares} />
               <HorasComplementares titulo="Prática extensionista" tom="extensionista" {...r.praticaExtensionista} />
               <div className="relatorio-horas" data-tom="eletivas">
                  <h3>Eletivas</h3>
                  <p className="relatorio-horas-valor">{eletivas.identificadas ? horas(eletivas.aproveitadas) : "—"}</p>
                  {eletivas.identificadas ? (
                     <>
                        <p>dispensadas de {horas(eletivas.exigidas)} previstas</p>
                        <p className="relatorio-horas-restantes">{horas(eletivas.exigidas - eletivas.aproveitadas)} não dispensadas</p>
                     </>
                  ) : (
                     <p>Carga não informada na matriz.</p>
                  )}
               </div>
            </div>
            {analise.atividadesComplementares.length ? (
               <div className="relatorio-registros">
                  <h3>Atividades complementares registradas</h3>
                  <ul>
                     {analise.atividadesComplementares.map(a => (
                        <li key={a.id}>
                           <span>
                              {a.atividade}
                              {a.ano === null ? "" : " · " + a.ano}
                              {a.periodo === null ? "" : " · período " + a.periodo}
                           </span>
                           <strong>{horas(a.ch)}</strong>
                        </li>
                     ))}
                  </ul>
               </div>
            ) : null}
            {analise.praticaExtensionista.length ? (
               <div className="relatorio-registros">
                  <h3>Práticas extensionistas registradas</h3>
                  <ul>
                     {analise.praticaExtensionista.map(p => (
                        <li key={p.id}>
                           <span>{p.descricao ?? "Prática extensionista"}</span>
                           <strong>{horas(p.ch)}</strong>
                        </li>
                     ))}
                  </ul>
               </div>
            ) : null}
            <p className="relatorio-previsao">
               Previsão de conclusão:{" "}
               {r.previsaoSemestres === null ? "não calculada" : plural(r.previsaoSemestres, "semestre", "semestres")} (estimativa; depende
               da oferta de disciplinas).
            </p>
            <footer>
               <p>
                  {caso.resumoCongeladoEm
                     ? "Análise concluída em " + fullDate(caso.resumoCongeladoEm)
                     : "Análise em andamento: decisões ainda podem mudar."}
                  {caso.responsaveis.analista ? " · " + caso.responsaveis.analista.nome : ""}
               </p>
               <strong>Documento apenas para consulta rápida, sujeito a alterações.</strong>
            </footer>
         </section>
      </article>,
      document.body,
   );
}
