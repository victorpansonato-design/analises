# 15 · Parâmetros configuráveis

> Todo número de negócio vive aqui e em `blueprints/parametros.ts` (que vira
> `src/features/casos/domain/parametros.ts`). **Nenhum desses valores pode aparecer "solto" no código.**
> Valores marcados **[proposta]** são sugestão de CX e precisam de validação; o único valor já
> definido pelo negócio é o SLA de 24 h da coordenação e o limite de 60 h por atividade complementar.
> No futuro, a API devolve esses parâmetros (`GET /parametros`) e o ADMIN edita.

## 1. Calendário

| Chave | Valor | Status |
|---|---|---|
| `calendario.horarioUtil` | seg a sex 08:00–18:00 | [proposta] |
| `calendario.sabado` | 08:00–12:00 | [proposta — confirmar se a equipe trabalha aos sábados] |
| `calendario.feriados` | lista vinda da API; nos mocks, feriados nacionais de 2026 e 2027 | [proposta] |
| `calendario.fuso` | `America/Sao_Paulo` | definido |

## 2. SLA por etapa

| Chave | Duração | Calendário | Alerta em | Status |
|---|---|---|---|---|
| `sla.documentos` | 7 dias | corridos | 70% | [proposta] |
| `sla.preAnalise` | 15 min | corridos | — | [proposta] |
| `sla.analise` | 8 h | úteis | 80% | [proposta] |
| `sla.coordenacao` | **24 h** | **[VALIDAR: úteis ou corridas]** | 80% | definido (24 h) |
| `sla.ajuste` | 4 h | úteis | 80% | [proposta] |
| `sla.primeiroContato` | 2 h | úteis | 80% | [proposta] |
| `sla.respostaNegociacao` | 2 h | úteis | 80% | [proposta] |

Escalonamento da coordenação: `escalonamento.coordenacao = [{ em: 1.0, notificar: "COORDENACAO_GERAL" }, { em: 2.0, notificar: "DIRETORIA", marcar: "escalado" }]` [proposta].

## 3. Réguas

| Chave | Valor | Status |
|---|---|---|
| `regua.documentos.lembretes` | D+1, D+3, D+5 às 09:00 | [proposta] |
| `regua.documentos.tarefaConsultorEm` | D+7 | [proposta] |
| `regua.documentos.encerrarEm` | D+15 com aviso prévio (motivo `DOCUMENTACAO_INCOMPLETA`) | [proposta — decidir se é automático] |
| `regua.proposta.lembretes` | D+1, D+3 às 10:00 | [proposta] |
| `regua.proposta.semRetornoDias` | 7 | [proposta] |
| `regua.limitePorDia` | 1 mensagem automática por candidato | [proposta] |
| `regua.janelaEnvio` | 08:00–20:00, sem domingos e feriados | [proposta] |
| `regua.pesquisaPosMatricula` | D+1 às 10:00 | [proposta] |

## 4. Checklist de documentos por tipo **[VALIDAR com Secretaria]**

| Tipo | Obrigatórios | Opcionais |
|---|---|---|
| Transferência externa | Histórico escolar da IES de origem (disciplinas, CH, notas, situação) · Planos de ensino/ementas das disciplinas cursadas · Declaração de vínculo | Documento de identidade, se ainda não houver no cadastro |
| Portador de diploma | Diploma de graduação (frente e verso) · Histórico da graduação · Planos de ensino/ementas | — |
| Transferência interna | — (histórico interno migrado automaticamente) | Requerimento com motivo da troca |
| Retorno sem vínculo | — (histórico interno) · se estudou fora: histórico externo e planos de ensino | — |
| Retorno com vínculo (alteração curricular) | — (histórico interno) | — |
| Aproveitamento de estudos | Histórico interno · histórico da instituição em que cursou as disciplinas · planos de ensino | — |

Motivos de recusa de documento: `ILEGIVEL` · `INCOMPLETO` · `DOCUMENTO_ERRADO` · `SEM_ASSINATURA_OU_CARIMBO` · `VENCIDO` · `OUTRO`.

## 5. Regras da análise **[VALIDAR com Regimento/Secretaria — todas]**

| Chave | Valor sugerido | Observação |
|---|---|---|
| `regras.chMinimaPercentual` | 75% | CH da origem ÷ CH do destino para sugerir dispensa. Prática comum, **não confirmada** para a UniAnchieta |
| `regras.notaMinima` | média de aprovação da IES de origem (vem do histórico) | |
| `regras.validadeDisciplinaAnos` | sem limite | algumas IES limitam; decidir |
| `regras.permitirSomaDeOrigens` | sim | várias disciplinas de origem somando CH para uma de destino |
| `regras.permitirOrigemRepetida` | não | uma disciplina de origem sustenta só uma dispensa |
| `regras.atividadeComplementarMaxHoras` | **60 h** | já existe no sistema atual |
| `regras.chMaximaPorPeriodo` | CH do período cheio da matriz | heurística de período de ingresso |
| `regras.dpAdapPorSemestre` | 2 | heurística de previsão de semestres |

## 6. IA

| Chave | Valor | Status |
|---|---|---|
| `ia.limiarAlta` | 0,85 | [proposta — calibrar com dados reais de aceite] |
| `ia.limiarMedia` | 0,6 | [proposta] |
| `ia.loteSomente` | `["ALTA", "REGRA"]` | definido (produto) |
| `ia.auditoriaAmostral` | 5% dos aceites em lote | [proposta] |
| `ia.conferirExtracaoAbaixo` | 0,75 (CH e nota lidas com confiança menor ficam destacadas para conferir no documento) | [proposta] |

## 7. Distribuição

| Chave | Valor | Status |
|---|---|---|
| `distribuicao.analise` | `MENOR_CARGA` | [proposta] |
| `distribuicao.matricula` | `MENOR_CARGA` entre a equipe de matrícula | [proposta] |
| `distribuicao.capacidadeMaxAtiva` | 25 casos por analista | [proposta] |

## 8. Interface

| Chave | Valor |
|---|---|
| `ui.pollingMs` | 30000 |
| `ui.desfazerMs` | 10000 |
| `ui.paginaFila` | 50 (cursor) |

## 9. Acrescentados na implementação do front

| Chave | Valor | Status |
|---|---|---|
| `ciclosAtivos` (`CICLOS_ATIVOS`) | `2027.1`, `2026.2`; o primeiro é o ciclo dos novos protocolos | [TI: virá de `GET /parametros`] |
| `documentos.anexo` (`ANEXO`) | PDF ou imagem, até 20 MB | [VALIDAR com TI: formatos e limite do GED] |
| `distribuicao.capacidadeMaxAtiva` | vale só para analistas (matrícula não tem teto) | [proposta] |
| `analise.atividadesComplementares` (`ATIVIDADES_COMPLEMENTARES`) | lista provisória de tipos de atividade | [VALIDAR com Secretaria] |

## 10. Metas da equipe de vendas (gestão comercial)

| Chave (`METAS`) | Valor | Status |
|---|---|---|
| `metaPadraoMensal` | 8 matrículas por consultor quando a gestora ainda não definiu | [proposta] |
| `noRitmoAPartirDe` | realizado ÷ esperado até hoje ≥ 0,95 = "No ritmo" | [proposta] |
| `atencaoAPartirDe` | ≥ 0,75 = "Atenção"; abaixo disso, "Abaixo do ritmo" | [proposta] |
| `diasUteis` | segunda a sexta | [VALIDAR] sábado conta para vendas? |
| `mesesDeHistorico` | 6 meses no seletor e no histórico do consultor | [proposta] |

Projeção = realizado ÷ dias úteis decorridos × dias úteis do mês. É sempre rotulada como estimativa.

## 11. Acompanhamento do aluno (link público)

| Chave (`CONTATO_ALUNO`) | Valor | Status |
|---|---|---|
| `whatsapp` | (11) 94847-7000, com a mensagem já começada e o protocolo | [definido pela dona do produto] |
| `appGrupoAnchieta` | App Store: apps.apple.com/br/app/grupo-anchieta/id1589456985 | [VALIDAR] link da Google Play |
| senha inicial exibida | "seu CPF, só os números"; o CPF em si não aparece no link público | [proposta] |
| `ATUALIZAR_ACOMPANHAMENTO_MS` | 30000 (e ao voltar para a aba) | [proposta] |
