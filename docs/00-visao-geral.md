# 00 · Visão geral do projeto Análises

> Documento-âncora. Leia antes de qualquer outro. Tudo o que está aqui é decisão tomada com a área de
> CX (Bianca Lessa) ou hipótese marcada como **[HIPÓTESE]** / **[VALIDAR]**. Nada que esteja marcado
> assim pode virar regra fixa no código sem confirmação: vira **parâmetro configurável**.

## 1. O problema em uma frase

O processo de análise curricular (transferência externa, portador de diploma, transferência interna e
retorno ao curso) **funciona**, mas depende de muitos toques humanos, telas longas, status ambíguos e
acompanhamento manual. Esse esforço cai em parte no time de vendas, que deveria estar vendendo, e
gera espera para o candidato num momento em que ele está comparando instituições.

## 2. O que o sistema novo precisa entregar

| # | Resultado | Como medimos (ver `10-indicadores.md`) |
|---|---|---|
| R1 | O consultor de vendas abre um protocolo em menos de 1 minuto e **não persegue documento** | Tempo médio de abertura · nº de ações manuais do consultor por caso |
| R2 | Nenhum caso fica parado sem dono e sem prazo | % de casos com responsável e SLA · casos com SLA estourado |
| R3 | A coordenação responde dentro de 24h e só sobre o que precisa dela | % SLA 24h cumprido · nº de itens enviados à coordenação por caso |
| R4 | A análise sai mais rápido e com menos retrabalho | Lead time protocolo → análise concluída · taxa de reanálise |
| R5 | Mais análises viram matrícula | Conversão "pronto para matrícula" → "matriculado" por tipo, curso e responsável |
| R6 | O candidato tem uma experiência sem esforço | CES do envio de documentos · CSAT pós-matrícula |
| R7 | O sistema vira a base de um "hub da captação" | Novos módulos entram sem nova tela de login e sem redesenho |

## 3. Princípios (inegociáveis)

1. **Mesma experiência, acesso comum.** Todos usam as oito filas e a página inteira de cada protocolo. Uma linha por análise, mesmo quando várias pertencem ao aluno. Papéis organizam responsáveis; etapa e dados obrigatórios definem as ações. docs/04 e docs/05 atualizados em 13/10/2026.
2. **Reduzir esforço vale mais do que encantar.** Cada clique, campo, troca de tela ou repetição de
   informação removido é ganho. Antes de criar algo novo, pergunte o que dá para eliminar.
3. **O sistema trabalha, a pessoa decide.** Lembretes, distribuição, pré-análise, prazos e próximos
   contatos são automáticos. A pessoa entra para decidir o que exige julgamento.
4. **Um próximo passo por vez.** Em qualquer caso, a tela diz em uma linha: o que falta, com quem
   está, até quando e qual é a ação. Uma ação primária por tela.
5. **Status é uma máquina, não um texto livre.** Um caso está em exatamente uma etapa, com um dono e
   um prazo. Fim de "Sem status" + "Finalizar processo" + "Pensando - Realizando análise" ao mesmo tempo.
6. **Causa-raiz.** Toda decisão da coordenação pode virar regra de equivalência reutilizável. O mesmo
   problema não pode chegar duas vezes à mesa da coordenação.
7. **A promessa da venda tem que ser a entrega.** Nenhum número de aproveitamento ou prazo de
   conclusão chega ao candidato antes da análise concluída. Rascunho de IA nunca é enviado.
8. **Não reinventar o que a equipe já domina.** O vocabulário atual (Dispensa, Regular, DP, ADAP,
   Atividades complementares, Prática extensionista, Migrar histórico, Mudança de matriz) é mantido.
   Mudamos a organização do espaço e o esforço, não a linguagem do time.
9. **Pronto para crescer.** A arquitetura é de "hub": a entidade central é a pessoa e o processo, e
   análise curricular é o primeiro tipo de processo. CRM, vestibular, bolsas e metas entram depois
   como módulos no mesmo shell.

## 4. Escopo da primeira entrega (ponta a ponta)

Protocolo → documentos → pré-análise com IA → análise → coordenação → ajuste → pronto para matrícula →
proposta via Blip → matriculado ou perdido (com motivo) → reanálise quando necessário.

**Forma de entrega técnica:** front-end completo (template React da Anchieta) com **dados
simulados (MSW)** e **contrato OpenAPI** (`contracts/openapi.yaml`) para o time de TI plugar a API
real depois. A IA de pré-análise **já existe** como endpoint interno: o front consome por um
adaptador, sem acoplar ao formato atual.

## 5. Fora de escopo agora (mas a arquitetura precisa permitir)

- Portal público do candidato para upload (a decisão entre WhatsApp e link web é do TI; ver `08`).
- CRM de leads, metas e rankings de vendas, vestibular, bolsas, rematrícula.
- Efetivação da matrícula no ERP (o front chama a ação; a integração real é do backend).
- Aplicativo mobile nativo.

## 6. Mapa da documentação

| Arquivo | Para quê |
|---|---|
| `01-diagnostico-sistema-atual.md` | O que as telas atuais mostram, gargalos e hipóteses |
| `02-jornada-e-processo.md` | Como é hoje e como passa a ser, por tipo de solicitação |
| `03-maquina-de-estados.md` | Etapas, transições, donos, SLA e eventos (o coração do sistema) |
| `04-papeis-e-permissoes.md` | Papéis, ações permitidas, mascaramento LGPD |
| `05-ux-tela-unica.md` | Layout da tela única, interações, teclado, mapa antigo → novo |
| `06-workspace-de-analise.md` | A área onde a análise curricular é feita |
| `07-ia-pre-analise.md` | Contrato com a IA existente, confiança e aprendizado |
| `08-comunicacao-blip.md` | Réguas de mensagem, templates prontos e integração |
| `09-arquitetura-e-integracoes.md` | Hub, módulos, adaptadores, eventos, mocks |
| `10-indicadores.md` | Indicadores com definição e denominador |
| `11-riscos-legais-lgpd.md` | Riscos legais, reputacionais e de dados |
| `12-roadmap-e-backlog.md` | Fases de implementação, histórias e critérios de aceite |
| `13-glossario.md` | Vocabulário do domínio |
| `14-decisoes-de-design.md` | ADRs: template × design system, rotas, estado, mocks |
| `15-parametros.md` | Todos os números configuráveis (SLA, limites, regras) |
