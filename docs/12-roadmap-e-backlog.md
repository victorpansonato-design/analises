# 12 · Roadmap de implementação e backlog

> Cada fase termina com: gates verdes (`npm test`, `npm run typecheck`, `npm run lint`,
> `npm run format`, `npm run build`), um resumo do que foi feito, prints/descrição do que testar e
> **parada para validação da Bianca** antes da fase seguinte. Dúvida de regra de negócio no meio da
> fase: parar e perguntar, não inventar.

## Fase 0 · Preparação do repositório

- Copiar o conteúdo do template para a raiz do repositório **sem** a pasta `.git` do template e sem
  `build/`.
- `npm install` → `npm run setup -- --name "Análises" --slug analises`.
- Copiar este kit: `CLAUDE.md` (raiz), `docs/`, `contracts/`, `blueprints/`, `fixtures/`, `.claude/commands/`.
- Colocar o design system enviado em `docs/design/DESIGN_SYSTEM.md` (o template já tem o seu
  `DESIGN-SYSTEM.md` na raiz: manter os dois, ver `14`).
- Adicionar `docs/`, `contracts/`, `fixtures/`, `blueprints/`, `PROMPT.md` e `CLAUDE.md` ao `.prettierignore` e os quatro diretórios aos `ignores` do
  `eslint.config.js` (são material de referência; os blueprints entram em `src/` na Fase 2 e a pasta é
  apagada depois).
- `.env.local` com `VITE_USE_MOCKS=true` (e a variável tipada em `src/config/env.ts`).
- Commit inicial.

**Aceite:** `npm run dev` abre o template renomeado; gates verdes.

## Fase 1 · Fundação visual híbrida

1. Ponte de tokens do DS sobre os tokens do template (ver `14` §3) em `src/index.css`.
2. `src/lib/motion.ts` e `src/lib/format.ts` (DS §8 e §12) + testes de `format`.
3. Ajustes de variante (sem reescrever) em `button` (pílula, alturas do DS), `card` (sem borda e sem
   sombra), `badge` → novos `Status` e `Tag` em `components/core`, `tabs`/segmented com `layoutId`.
4. Primitivos do DS em `components/core`: `Status`, `Tag`, `Hint`, `Denominator`, `AnimatedNumber`,
   `SegmentedControl`, `MeterBar`, `Timeline`, `StatTile` simples.
5. Shell: sidebar recolhida por padrão; header com trigger de ⌘K, seletor de ciclo, sino, selo
   "Dados fictícios"; transição de página do DS (260 ms); Sonner com o estilo do Toaster do DS.
6. Pré-pintura do tema no `index.html` compatível com a chave `app-theme` do template (ver `14` §5).
7. Rota DEV `/dev/ui` (só `import.meta.env.DEV`) mostrando os primitivos nos dois temas.

**Aceite:** zero borda em volta de card; um primário por tela; nada de `transition-all`, `font-bold`,
caixa alta; claro e escuro sem flash; `prefers-reduced-motion` respeitado.

## Fase 2 · Domínio, contrato e mocks

1. Schemas Zod a partir de `contracts/openapi.yaml` e `blueprints/caso.schema.ts`.
2. `domain/`: `caso.machine.ts`, `permissoes.ts`, `sla.ts`, `prioridade.ts` (a partir dos blueprints) com
   testes cobrindo **todas** as transições e guardas.
3. MSW + seed determinística (ver `09` §4); handlers aplicando máquina e permissões.
4. `GET /me` simulado + seletor de papel (DEV).

**Aceite:** testes do domínio ≥ 90% de cobertura de linhas; mocks respondem todo o contrato usado nas
fases 3–7; trocar o papel muda `acoesDisponiveis`.

## Fase 3 · Tela única: funil, fila e painel

Histórias:

- **H3.1** Como qualquer papel, vejo o funil com contagem e atrasados por etapa e filtro a fila clicando.
- **H3.2** Como analista, abro a tela e vejo "Minha vez" ordenada por prioridade, com SLA em cada linha.
- **H3.3** Abro um caso sem sair da tela; a URL muda e o link funciona para outra pessoa.
- **H3.4** Vejo identidade, jornada com SLA e o card "Próximo passo" com no máximo uma ação primária.
- **H3.5** Uso `J`/`K`, `N` (Pegar próximo), `⌘K`, `1`–`5`.
- **H3.6** Ações desabilitadas explicam o motivo.
- **H3.7** Encerrar, cancelar, adiar, reanálise e reabrir pedem motivo em modal.
- **H3.8** Aba Dados com os campos agrupados (inclui "Dados do vestibular"), edição inline por permissão,
  CPF mascarado com revelar.

**Aceite:** fluxo de etapa ponta a ponta pelos mocks usando só "Próximo passo" e "Mais ações";
fila com 300 casos rolando liso; responsivo nos três breakpoints de `05` §7.

## Fase 4 · Workspace de análise

- **H4.1** Grade por período com destino, origem sugerida, comparação de CH, confiança e decisão.
- **H4.2** Filtros Pendentes/Divergentes/Para coordenação/Decididas; busca de disciplina.
- **H4.3** "Aceitar N sugestões de alta confiança" com confirmação e desfazer.
- **H4.4** Seleção múltipla e decisão em lote; teclado da grade.
- **H4.5** Resumo lateral (CH, %, contagens, ingresso sugerido, previsão rotulada como estimativa).
- **H4.6** Perguntar à coordenação por item; enviar para coordenação.
- **H4.7** Modo coordenação: responder item a item, aprovar todas, "usar como regra".
- **H4.8** Atividades complementares (limite por atividade), prática extensionista (total ÷ exigido),
  disciplinas personalizadas de pós quando aplicável.
- **H4.9** Origem não aproveitada (lista) e "Trocar origem".
- **H4.10** Trocar matriz com prévia de impacto.
- **H4.11** Bloqueios de "Concluir análise" listados e clicáveis.

**Aceite:** uma análise de 45 itens com 32 sugestões altas é concluída em ≤ 15 interações quando não
há divergência (medir pelos eventos de UI); coordenação funciona a 390 px.

## Fase 5 · Protocolo, documentos, comunicação e histórico

- **H5.1** Novo protocolo em um drawer com lookup por CPF, detecção de tipo e de duplicidade.
- **H5.2** Checklist de documentos por tipo (`15` §4), estados, visualizador, aceitar/recusar com motivo.
- **H5.3** Migrar histórico interno (interna/retorno).
- **H5.4** Linha do tempo única com filtros e notas com @menção.
- **H5.5** Mensagem ao candidato com templates, prévia fiel e bloqueio de variável vazia.
- **H5.6** Régua visível no caso ("Próximo lembrete automático: amanhã 9h") e possibilidade de "Lembrar agora".

## Fase 6 · Matrícula e desfecho

- **H6.1** Aba Proposta com resumo congelado, condição financeira e previsão.
- **H6.2** Enviar proposta (template) e registrar resposta (manual e via evento).
- **H6.3** Efetivar matrícula com registro de aceite.
- **H6.4** Sem retorno automático (D+7) e encerramento com motivo.
- **H6.5** Reanálise volta para a mesma analista com motivo e contador.

## Fase 7 · Indicadores, notificações e SLA

- **H7.1** Painel de indicadores (`?painel=indicadores`) com MetricSheet.
- **H7.2** Notificações in-app (sino) para: atribuído a mim, pergunta da coordenação, resposta da
  coordenação, @menção, SLA em atenção/estourado, mensagem do candidato.
- **H7.3** Escalonamento visível de coordenação.
- **H7.4** Telemetria de UI (`10` §6).

## Fase 8 · Endurecimento e entrega para o TI

- Auditoria de acessibilidade (teclado, foco, ARIA, contraste nos dois temas).
- Revisão contra o checklist do DS (§16) e contra `14`.
- Testes de componente faltantes; cobertura geral ≥ 70%.
- `docs/INTEGRACAO.md` para o TI: como desligar mocks, endpoints esperados, adaptador da IA, Blip, SSE.
- Lista de **[VALIDAR]** pendentes consolidada.

## Backlog futuro (hub da captação)

Ficha 360° da pessoa · CRM de leads integrado ao protocolo · metas e ranking da equipe de vendas
alimentados por `matricula.efetivada` · vestibular/ENEM como novo `tipoProcesso` · bolsas e descontos ·
régua de boas-vindas (Frente 1) disparada pela matrícula · portal do candidato · app do coordenador.


## Atualização operacional · 13/10/2026

Fases 0–8 concluídas na entrega inicial. Reformulação autorizada: tabela horizontal com protocolos separados, página inteira por análise, oito filas coloridas, acesso comum, busca por aluno e curso/oferta à vista. MAT é independente da etapa. As referências anteriores a papéis descrevem responsabilidades e não restringem ações humanas. docs/04, docs/05 e ADR-011 prevalecem sobre descrições de mestre-detalhe e limitações por papel. Preservar guardas, motivos, aceite e concorrência.
