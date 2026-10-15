# 10 · Indicadores

> Regra do DS (§10.16 e §11): **nenhuma taxa sem denominador**, nenhuma curva que discorde do número
> ao lado, demonstração se declara. Todo indicador abaixo tem definição, denominador e fonte (eventos
> de `03` §9). Casos `CANCELADO` com motivo `TESTE` ficam fora de tudo.

## 1. Onde aparecem (sem sair da tela única)

- **Faixa do funil** (sempre visível): contagem por etapa ativa + atrasados.
- **Painel de indicadores** (`?painel=indicadores`): substitui fila+caso por uma grade de indicadores
  com recorte por ciclo, tipo, curso e modalidade. Clicar em qualquer indicador abre um **MetricSheet**
  (drawer, DS §10.17): medida + denominador → composição → "Como ler". Nunca manda a pessoa para outra tela.
- Os números do painel e do funil vêm do **mesmo endpoint** (`/indicadores`) para não discordarem.

## 2. Indicadores de fluxo

| Indicador | Definição | Denominador | Meta inicial **[proposta]** |
|---|---|---|---|
| Lead time total | Mediana e p90 de `caso.criado` → `analise.concluida` | casos concluídos no período | definir após 1º mês |
| Tempo por etapa | Mediana e p90 do tempo em cada etapa (sem pausas) | casos que saíram da etapa | — |
| SLA cumprido por etapa | Saídas da etapa dentro do SLA ÷ saídas | saídas da etapa | Coordenação ≥ 90% |
| Casos atrasados agora | Casos ativos com SLA `ESTOURADO` | casos ativos | tendência de queda |
| Idade dos casos ativos | Distribuição (0–1 d, 1–3 d, 3–7 d, > 7 d) | casos ativos | — |
| Tempo até documentos completos | `caso.criado` → `documentos.completos` | casos com documentos completos | — |
| 1º contato da matrícula | `analise.concluida` → `proposta.enviada` | propostas enviadas | ≤ `sla.primeiroContato` |

## 3. Indicadores de resultado (impacto no caixa)

| Indicador | Definição | Denominador |
|---|---|---|
| Conversão análise → matrícula | `MATRICULADO` ÷ casos que chegaram a `PRONTO_PARA_MATRICULA` | coorte por data de conclusão da análise |
| Conversão por tipo, curso, modalidade e responsável | idem, com recorte | idem |
| Motivos de perda | Distribuição de motivos de `PERDIDO` | casos perdidos |
| Taxa de reanálise | Casos com `reanalises ≥ 1` ÷ análises concluídas | análises concluídas |
| Aproveitamento médio | Média de CH dispensada ÷ CH da matriz | análises concluídas |

**Atenção à coorte:** conversão sempre por coorte de entrada (casos que ficaram prontos na semana X e
quantos destes matricularam), nunca "matrículas desta semana ÷ prontos desta semana".

## 4. Indicadores de esforço (o foco deste projeto)

| Indicador | Definição | Por que importa |
|---|---|---|
| Toques do consultor por caso | Nº de ações manuais do consultor por caso (eventos com autor CONSULTOR) | R1: o tempo dele é de venda |
| Toques humanos por caso | Nº total de ações humanas até `analise.concluida` | Esforço interno |
| Transferências de responsável por caso | Nº de `caso.atribuido` após o primeiro | Cada troca é atrito |
| Itens enviados à coordenação por caso | Perguntas ÷ casos concluídos | R3; deve cair com a base de equivalências |
| Aceite da IA sem alteração | ver `07` §4 | Qualidade da pré-análise |
| Lembretes por candidato até documentos completos | Mensagens `lembrete_documentos` ÷ casos | Clareza do checklist |
| Recusas de documento por motivo | Distribuição | Causa-raiz (ex.: instrução de foto ruim) |

## 5. Indicadores de experiência do candidato

| Indicador | Momento | Pergunta | Cálculo |
|---|---|---|---|
| CES (esforço) | D+1 após matrícula | "De 1 a 5, quão fácil foi enviar seus documentos e entender sua análise?" | % de respostas 4–5 ÷ respostas |
| CSAT (opcional, mesmo envio) | D+1 após matrícula | "Como avalia o atendimento até a matrícula?" | % 4–5 ÷ respostas |
| Pergunta aberta | junto | "O que poderia ter sido mais fácil?" | leitura qualitativa + categorização |

Taxa de resposta sempre exibida junto (respostas ÷ enviados). NPS relacional fica para a pesquisa
institucional; aqui o foco é transacional.

## 6. Eventos de instrumentação no front (além dos de domínio)

Para medir esforço da interface (sem dado pessoal): `ui.caso_aberto` (origem: fila, busca, link),
`ui.pegar_proximo`, `ui.aceite_em_lote` (n itens), `ui.atalho_usado` (tecla), `ui.acao_desabilitada_clicada`
(qual e motivo — mostra onde a interface confunde). Enviar para `/telemetria` **[VALIDAR com TI]**;
nos mocks, só `console.debug`.
