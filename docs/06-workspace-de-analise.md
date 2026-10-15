# 06 · Workspace de análise (aba "Análise")

> Onde a equipe de análises passa a maior parte do dia. Objetivo: **decidir só o que exige julgamento**.
> A IA e a base de equivalências trazem a sugestão; a analista confirma em lote o que é óbvio e foca
> nos itens divergentes.

## 1. Layout

```text
┌ IDENTIFICAÇÃO DO PROTOCOLO ───────────────────────────────────────────────────┐
│ Aluno · RA · curso · modalidade · matrícula · protocolo                      │
├ ÁREA DE TRABALHO ────────────────────────────────┬ PAINEL DA EQUIPE (360 px) ─┤
│ Etapa · Jornada · Próximo passo                  │ OBSERVAÇÕES DO PROTOCOLO    │
│ [Análise] [Documentos] [Dados] [Proposta]         │ [Observações][Mensagens]    │
│                                                 │ [Histórico]                 │
│ Matriz · filtros · busca · decisões em lote      │ Adicionar observação        │
│ Resumo: aproveitamento · disciplinas · ingresso  │ Notas roxas mais recentes   │
│                                                 │ Autor · data · horário      │
│ Grade por período: disciplina · origem · decisão│ Observações anteriores      │
│ Atividades complementares · prática extensionista│                            │
└─────────────────────────────────────────────────┴─────────────────────────────┘
```

O botão `Concluir análise` mora no card "Próximo passo" (um primário por tela). O resumo mostra
"Faltam 9 decisões" enquanto houver pendência.

## 2. Linha da grade (um item da matriz de destino)

| Parte | Conteúdo | Regras visuais |
|---|---|---|
| Destino | Nome da disciplina + CH (mono) | `text-[13px] font-medium` |
| Origem | Disciplina(s) de origem sugerida(s): nome · IES · ano/semestre · CH · nota | `text-[12px] text-ink-3`; várias origens somadas mostram "2 disciplinas · 64 h" com expansão |
| Comparação de CH | Barra fina CH origem ÷ CH destino; abaixo do mínimo `regras.chMinimaPercentual` → `text-crit-ink` | Valor sempre com denominador ("48 h ÷ 60 h") |
| Confiança | `Alta` · `Média` · `Baixa` · `Regra` (veio da base de equivalências) | Status com ponto + palavra (DS §12); `Alta`/`Regra` sem ponto (estado saudável em silêncio) |
| Decisão | Segmented `Dispensa · Regular · DP · ADAP` (física, DS §7) | Sugestão da IA aparece pré-marcada **em tom fantasma** até ser confirmada; confirmada fica sólida |
| Mais (⋯) | Ver ementas lado a lado · Trocar origem · Perguntar à coordenação · Ver histórico de decisões desta equivalência | |

**Estados de um item:** `SUGERIDO` (IA, não confirmado) → `DECIDIDO` (pessoa confirmou ou alterou) ·
`PERGUNTA_ABERTA` (dúvida registrada; segue aberta até a coordenação responder) → `RESPONDIDO`
(coordenação decidiu; **conta como decidido** para concluir a análise, e a analista pode ajustar).
Cada decisão registra `por`, `em`, `origem` (`IA` | `REGRA` | `ANALISTA` | `COORDENACAO`) e, se
alterou a sugestão, `motivo` opcional (lista curta: "CH insuficiente", "conteúdo divergente",
"nota/reprovação", "prazo de validade", "outro").

## 3. Ações em lote

- **Aceitar sugestões de alta confiança (N):** confirma todos os itens `SUGERIDO` com confiança `Alta`
  ou `Regra`. Mostra modal de confirmação com a lista resumida e "Desfazer" no toast por 10 s.
- **Selecionar vários** (checkbox na linha, `Shift` para intervalo) → definir decisão em lote.
- **Marcar período inteiro como Regular.**
- Toda ação em lote gera **um** evento `analise.itens_em_lote` na linha do tempo, com a contagem.

## 4. Pergunta à coordenação (por item, não pela análise inteira)

1. Analista abre "Perguntar à coordenação" no item: texto curto obrigatório + decisão que ela sugere.
2. O item vai para `PERGUNTA_ABERTA`. Ela pode perguntar sobre vários itens e depois clicar
   `Enviar para coordenação` (transição `ENVIAR_COORDENACAO`) — uma notificação só.
3. **Modo coordenação** (o coordenador abre o caso): a aba Análise abre filtrada em "Para
   coordenação". Cada pergunta mostra: item de destino, origem, ementas lado a lado, pergunta da
   analista, sugestão. Botões: `Aprovar sugestão` · `Decidir diferente` (segmented + comentário).
   Checkbox **"Usar como regra para os próximos casos"** (marcado por padrão) → cria equivalência
   `IES + disciplina de origem → disciplina de destino` (ver `07` §5).
4. Botão `Aprovar todas as sugestões` quando concorda com tudo. Ao responder a última pergunta, o
   `Próximo passo` mostra `Devolver para a analista` (transição `RESPONDER_COORDENACAO`).
5. O coordenador também pode alterar outros itens se quiser; fica registrado como `COORDENACAO`.

## 5. Teclado na grade

| Tecla | Ação |
|---|---|
| `↑` `↓` | Item anterior / próximo |
| `1` `2` `3` `4` | Dispensa / DP / ADAP / Regular no item focado |
| `Enter` | Confirmar sugestão do item focado |
| `Espaço` | Expandir comparação de ementas |
| `C` | Perguntar à coordenação |
| `X` | Selecionar item (lote) |
| `]` / `[` | Próximo / anterior item **pendente** |

## 6. Regras de cálculo do resumo **[parâmetros — VALIDAR com Secretaria e Regimento]**

- **CH dispensada** = soma da CH de destino dos itens com decisão `DISPENSA`.
- **Aproveitamento %** = CH dispensada ÷ CH total da matriz de destino (sempre exibir o denominador).
- **Ingresso sugerido**: o menor período em que a soma da CH a cursar não ultrapassa
  `regras.chMaximaPorPeriodo` respeitando pré-requisitos **[HIPÓTESE de heurística]**. A analista
  sempre confirma; é sugestão.
- **Previsão de semestres**: períodos restantes a partir do ingresso + semestres extras para DP/ADAP
  conforme `regras.dpAdapPorSemestre`. Sempre rotulado como "estimativa" e com a frase "depende da
  oferta de disciplinas".
- **Atividades complementares**: soma das horas; cada atividade ≤ `regras.atividadeComplementarMaxHoras`
  (60 h, regra já presente no sistema atual); total exibido contra o exigido pela matriz.
- **Prática extensionista**: total entregue ÷ exigido pela matriz (ex.: 310 h).

## 7. Validações que bloqueiam `Concluir análise`

- Item sem decisão confirmada.
- Pergunta à coordenação aberta.
- Período de ingresso vazio.
- Atividade complementar acima do limite por atividade.
- Disciplina de origem usada em duas dispensas quando `regras.permitirOrigemRepetida = false`.

Cada bloqueio aparece numa lista clicável ("Ir para o item") no card Próximo passo.

## 8. Mudança de matriz e retorno

- **Trocar matriz** (antigo "Enviar mudança de matriz"): escolhe a matriz vigente; mostra prévia
  "12 decisões serão mapeadas automaticamente, 5 precisarão de revisão"; confirma → `ALTERAR_DESTINO`.
- **Retorno/interna:** a origem são as disciplinas do histórico interno; o mapeamento entre matrizes
  internas vem da API (`/matrizes/{id}/equivalencias-internas`) e tende a ser `Regra`.

## 9. Impressão e exportação

"Exportar PDF" abre a impressão do navegador para salvar o relatório A4. Espera o carregamento do logo e das fontes. O documento usa a identidade do Grupo Anchieta, aluno/RA, protocolo, curso, modalidade, matriz, ingresso, data e versão. Inclui toda a grade por período, independente dos filtros da tela, com decisões confirmadas, disciplinas de origem e notas. Sugestões nunca aparecem como dispensas; itens pendentes saem como "Sem decisão".

Aviso no início e no final: documento apenas para consulta rápida, sujeito a alterações. Cabeçalhos de tabela repetem nas continuações; linhas não são partidas. A interface e as notas internas ficam fora do PDF. A impressão usa fundo branco inclusive quando o sistema está no tema escuro, com paginação no rodapé.

No final: atividades complementares em amarelo, prática extensionista em verde e eletivas em laranja, seguidas dos registros de horas e da previsão identificada como estimativa. O contrato atual não classifica componentes como eletivas: são somadas apenas disciplinas com nome explícito "Eletiva(s)"; somente dispensas confirmadas contam como horas aproveitadas. Na ausência de identificação, mostrar "Carga não informada na matriz", sem assumir zero ou uma exigência inexistente. A classificação oficial pelo catálogo permanece uma evolução do contrato.

## 10. Observações na análise

O painel da equipe pertence ao protocolo inteiro: aparece na parte superior direita já na abertura, inclusive antes de existir uma análise curricular. Observações mantêm o visual roxo, texto completo, autor, data e hora de São Paulo. Em telas estreitas, vêm logo após a identificação. Não existe aba principal de histórico: as miniabas Observações, Mensagens e Histórico ficam nesse painel. A API, o cache, a paginação, as @menções e as permissões continuam compartilhados.

As três observações mais recentes aparecem de início; "Observações anteriores" revela as demais sem perder registros. O campo abre sob demanda com foco e preserva o rascunho ao fechar ou alternar abas. O resumo curricular passa a ocupar uma faixa acima da grade, preservando sua largura. Não há exclusão de notas sem ação prevista no contrato. Notas, mensagens e registros internos continuam fora da exportação PDF.
