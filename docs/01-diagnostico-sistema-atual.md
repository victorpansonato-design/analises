# 01 · Diagnóstico do sistema atual (Central Acadêmica › Análises)

> Base: capturas de tela do módulo "Controle de análises" de 09/10/2026 16:19. Os números abaixo são
> os que aparecem na tela naquele momento. **As capturas contêm dados reais de alunos: nunca copie
> nomes, RA, CPF, e-mail ou telefone delas para o código, mocks, testes ou commits.**

## 1. O que existe hoje

### 1.1 Painel "Controle de análises" (8 cartões coloridos)

| Cartão | Valor na tela | Leitura |
|---|---|---|
| Novas análises | 4 | Entrada do dia |
| Aguardando documentos | 87 | **Maior fila ativa.** Gargalo de coleta de documentos |
| Em análise | 29 | Trabalho da equipe de análises |
| Em análise coordenador | 39 | **Maior que "Em análise".** A coordenação acumula mais do que a equipe |
| Entregue pelo coordenador | 8 | Volta para ajuste da equipe |
| Liberadas matrícula | 2.464 | Ver hipótese H4 |
| Concluídas | 65.777 | Histórico acumulado |
| Todas | 68.408 | Histórico acumulado |

### 1.2 Lista "Em análise"

Colunas: Perfil (botão) · MAT (✗) · RA · Nome · Curso · Tipo solic. / Situação · Usuário · Datas
(Inclusão · Próx. cont. · Liberado matrícula). Busca por RA/nome/CPF, filtros por coluna, exportar
PDF e Excel.

Observações da amostra visível:

- A coluna **Situação** é texto composto: "Reanalise - Realizando Análise", "Ag. Anal. Coordenação -
  Realizando Análise", "Pensando - Realizando Análise", "Ag. Edital DP - Realizando Análise".
- Há caso com **inclusão em 02/10/2025** ainda na lista "Em análise" um ano depois.
- Há caso com **Curso vazio**.
- A coluna **Usuário** aparece vazia nas linhas visíveis: não fica claro quem é o dono do caso.
- "MAT ✗" não explica o que significa sem treinamento.
- "Próx. cont." é preenchido à mão.

### 1.3 Perfil do candidato (uma página longa com rolagem)

- **25 campos** num formulário único: identificação, nome, e-mail, candidato, telefone, celular,
  curso, turno, currículo, CPF, RA, outro RA, datas (inclusão, envio secretaria, envio coordenador,
  devolução coordenador), status, protocolo, tipo de solicitação, situação, observações, instituição
  anterior, motivo da escolha, motivo de encerramento, ano/semestre/período de ingresso, data de
  próximo contato, coordenador.
- **Status** e **Situação** são campos diferentes e podem se contradizer ("Sem status" com
  "Finalizar processo").
- **Documentos:** 9 ícones de mesmo peso (Histórico, Plano de ensino, Diploma, Anexar, Histórico
  anterior, Disciplinas pendentes, Previsão de disciplinas, Logs, Enviar push). Não mostram se o
  documento foi recebido, está pendente ou foi recusado.
- **Observações:** balões de chat roxos com autor e data, misturando eventos do sistema ("Contato
  sendo encerrado. WhatsApp já foi enviado.") e anotações humanas.
- **Ações:** 6 botões grandes de mesmo peso (Lançar análise, Imprimir análise, Status documentos,
  Reabrir análise, Abrir uma nova análise, Enviar mudança de matriz). Nenhum indica qual é o próximo
  passo.
- **Três sanfonas** abaixo: Análise, Atividades complementares, Prática extensionista. Mais
  "Disciplinas personalizadas PÓS".

### 1.4 Grade de análise

- Agrupada por período. Colunas: Disciplina · CH · Ano · Semestre · Nota · Disciplinas análise ·
  Dispensa · DP · ADAP · Regular.
- No exemplo: **45 disciplinas regulares**, todas marcadas como "Regular" por padrão (V verde).
- Botão **"Validar com IA"** separado: a IA roda sob demanda, não automaticamente.
- Não aparece o lado da origem (disciplina cursada, IES, CH) em paralelo com a disciplina de
  destino, nem a confiança da sugestão.
- Atividades complementares: seleção + CH (máx. 60 h por atividade) + inserir.
- Prática extensionista: CH + inserir + total de horas entregues.

## 2. Gargalos identificados

| # | Gargalo | Evidência | Quem sofre | Frente de CX |
|---|---|---|---|---|
| G1 | Coleta de documentos manual | 87 em "Aguardando documentos" | Candidato, vendas | 1 · 3 |
| G2 | Coordenação como funil | 39 na coordenação > 29 em análise; SLA de 24h não aparece na tela | Coordenação, candidato | 3 |
| G3 | Status ambíguo e composto | Status × Situação; texto livre | Todos | 3 · 4 |
| G4 | Sem dono visível | Coluna Usuário vazia | Todos | 3 |
| G5 | Sem prazo visível | Nenhum SLA na lista; caso de 2025 aberto | Gestão | 3 · 4 |
| G6 | Follow-up manual | "Próx. cont." digitado | Vendas, matrícula | 1 · 2 |
| G7 | Pré-análise sob demanda | Botão "Validar com IA" | Equipe de análises | 3 |
| G8 | Tela longa sem hierarquia | 25 campos, 9 ícones, 6 botões, 3 sanfonas | Equipe de análises | 3 |
| G9 | Histórico misturado | Eventos do sistema e notas humanas no mesmo balão | Todos | 4 |
| G10 | Dados de teste em produção | "CRISTIANO TESTE", observação "teste." | Gestão, indicadores | 4 |
| G11 | Painel arco-íris | 8 cartões com 8 cores; cor não significa urgência | Gestão | 4 |
| G12 | Tudo em caixa alta | Rótulos e nomes em maiúsculas | Equipe (fadiga em 8 h/dia) | Experiência do colaborador |
| G13 | Matrícula sem desfecho visível | 2.464 em "Liberadas matrícula" | Vendas, financeiro | 2 · 6 |

## 3. Hipóteses de causa **[HIPÓTESE — validar com dados]**

- **H1 (G1):** o candidato não sabe exatamente quais documentos enviar e por qual canal; o consultor
  vira intermediário. *Dado para validar:* tempo entre abertura e documento completo, nº de contatos
  do consultor por caso, motivos de documento recusado.
- **H2 (G2):** a coordenação recebe a análise inteira para revisar, quando só tem dúvida em poucas
  disciplinas; e decisões repetidas (mesma disciplina da mesma IES) voltam a cada caso. *Dado:* nº de
  itens alterados pela coordenação por caso; repetição de pares IES+disciplina.
- **H3 (G3/G5):** sem máquina de estados, casos ficam em situações intermediárias sem prazo
  ("Pensando", "Ag. edital DP") e não aparecem como atrasados. *Dado:* distribuição de idade dos
  casos abertos por situação.
- **H4 (G13):** "Liberadas matrícula" pode estar acumulando casos sem desfecho registrado
  (matriculou ou desistiu). *Dado:* extração por data de liberação e cruzamento com matrículas
  efetivadas no ERP. Não tratar 2.464 como "perda" sem essa verificação.
- **H5 (G7):** a IA rodando só quando alguém clica atrasa o início da análise e desperdiça o tempo em
  que o caso fica parado na fila.

## 4. O que **manter** (funciona e o time domina)

- Os conceitos e rótulos de decisão: Dispensa, Regular, DP, ADAP.
- Agrupamento da matriz por período.
- Atividades complementares com limite por atividade e Prática extensionista com total.
- Busca por RA, nome ou CPF.
- Exportar para PDF e Excel (agora exportando exatamente o filtro atual).
- Migrar histórico, Mudança de matriz, Reabrir análise, Nova análise para o mesmo candidato.
- Registro "Análise já no GED".

## 5. O que **eliminar ou automatizar**

| Hoje | Amanhã |
|---|---|
| Consultor cobra documento | Régua automática no WhatsApp (Blip) com checklist por tipo |
| "Validar com IA" sob demanda | Pré-análise dispara sozinha quando os documentos ficam completos |
| Revisão da análise inteira pela coordenação | Pergunta por disciplina com contexto e resposta em um clique |
| Decisão repetida da coordenação | Base de equivalências: a decisão vira regra reutilizável |
| "Próx. cont." digitado | Próximo contato calculado pela régua e pelo SLA da etapa |
| Status + Situação em texto | Uma etapa da máquina de estados + motivo padronizado |
| Usuário vazio | Todo caso tem dono; distribuição automática e "Pegar próximo" |
| Balões de observação misturados | Linha do tempo única com tipos distintos (sistema, nota, mensagem, decisão) |
| 6 botões de mesmo peso | Um botão "Próximo passo" + menu de ações secundárias |
| 8 cartões coloridos | Faixa do funil monocromática; vermelho só para atrasado |
