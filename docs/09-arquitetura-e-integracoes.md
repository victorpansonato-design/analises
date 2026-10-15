# 09 · Arquitetura e integrações

> Base: o template React da Anchieta (Bulletproof React, camadas `app → feature → shared` validadas por
> `eslint-plugin-boundaries`). **Não mudar essa arquitetura**: estender. Leia `ARCHITECTURE.md` e
> `CONTRIBUTING.md` do template antes de criar qualquer feature.

## 1. Visão de hub (para o futuro "tudo em um só")

```
                         ┌──────────────── Shell do hub (layout, auth SSO, ⌘K, notificações) ───────────────┐
                         │                                                                                  │
   Pessoa (CPF) ──┬── Processo: Análise curricular  ← ESTE PROJETO                                          │
                  ├── Processo: Vestibular / ENEM    (futuro)                                                │
                  ├── Processo: Bolsa / desconto     (futuro)                                                │
                  ├── Lead / oportunidade (CRM)      (futuro)                                                │
                  └── Matrícula / contrato           (futuro, hoje é a etapa final da análise)               │
                         │                                                                                  │
                         └── Serviços transversais: linha do tempo · SLA · tarefas ("Minha vez") · mensagens ┘
```

Decisões que preparam isso **agora**, sem custo extra:

1. O conceito central do código é **`Caso`** (um processo de uma pessoa), com `tipoProcesso:
   "ANALISE_CURRICULAR"`. Vestibular e bolsa serão outros `tipoProcesso` com máquinas próprias.
2. **Linha do tempo, SLA, notificações e "Minha vez"** são features genéricas que recebem eventos e
   etapas de qualquer processo (não sabem o que é "disciplina").
3. **`Pessoa`** é feature própria (dados de contato, CPF, vínculos). Hoje aparece dentro do caso; amanhã
   vira a "ficha 360°" que reúne todos os processos.
4. Integrações externas ficam atrás de **adaptadores** no backend; o front só conhece o nosso contrato.
5. A navegação nasce em `src/config/navigation.ts` (como o README do template recomenda), para novos
   módulos entrarem só com uma linha.

## 2. Estrutura de pastas (alvo)

```text
src/
├── routes/app.routes.tsx            # "/" → "/analises"; "/analises" é a tela única
├── layout/                          # shell do template (sidebar recolhida por padrão, header com ⌘K)
├── pages/protected/analises.tsx     # compõe as features (fila + painel)
├── config/
│   ├── env.ts                       # (template) + VITE_USE_MOCKS
│   └── navigation.ts                # itens do menu (hoje: Análises)
├── mocks/                           # MSW: browser.ts, handlers/*, seed/* (PRNG com semente)
├── lib/
│   ├── utils.ts                     # (template)
│   ├── motion.ts                    # DS §8 (spring, emphasis, variants, press)
│   └── format.ts                    # DS §12 (pt-BR: int, percent, money, stamp, relative…)
├── components/
│   ├── ui/                          # shadcn (template) — ajustes de variante para o visual híbrido
│   └── core/                        # primitivos do DS que não são shadcn: Status, Tag, Hint,
│                                    # Denominator, AnimatedNumber, SegmentedControl, Timeline, MeterBar
└── features/
    ├── casos/                       # fila, painel, funil, próximo passo, ações, máquina de estados
    │   ├── api/                     # casos.keys / casos.queries / casos.mutations
    │   ├── components/              # queue/*, case-panel/*, funnel-strip, next-step-card, journey
    │   ├── domain/                  # caso.machine.ts · permissoes.ts · sla.ts · prioridade.ts (puros, testados)
    │   ├── hooks/                   # use-casos-url-state (visao, etapa, filtros, caso, aba, ordem)
    │   ├── stores/                  # UI transversal da tela (ex.: seleção em lote) — nunca dado de servidor
    │   ├── types/                   # caso.schema.ts (Zod)
    │   └── index.ts
    ├── analise/                     # workspace da análise curricular (grade, lote, coordenação, resumo)
    ├── documentos/                  # checklist, visualizador, upload, migrar histórico
    ├── comunicacao/                 # templates, prévia, envio, mensagens na timeline
    ├── timeline/                    # linha do tempo genérica + notas com @menção
    ├── protocolo/                   # drawer "Novo protocolo" + lookup de pessoa
    ├── proposta/                    # aba Proposta, aceite, efetivação
    ├── indicadores/                 # funil detalhado, MetricSheet, painéis
    ├── notificacoes/                # sino, central, preferências
    └── pessoas/                     # dados da pessoa (base da futura ficha 360°)
```

Regra do template: uma feature só importa outra pelo `index.ts`. O painel do caso (em `casos`) compõe
as abas importando `AnaliseTab` de `@/features/analise`, `DocumentosTab` de `@/features/documentos` etc.

`src/mocks` precisa ser registrado no `eslint.config.js` como elemento próprio (`type: "mocks"`) que
pode importar `feature` (só `index.ts`) e `shared`, e que só `src/main.tsx` importa. Ajustar o
`boundaries/elements` e `boundaries/dependencies` do template, sem afrouxar as demais regras.

## 3. Estado (matriz de decisão do template, aplicada)

| Estado | Onde | Exemplos |
|---|---|---|
| Servidor | TanStack Query | lista de casos, caso, análise, documentos, timeline, funil |
| URL | `useSearchParams` | `caso`, `aba`, `visao`, `etapa`, `tipo`, `curso`, `turno`, `resp`, `ordem`, `q`, `painel` |
| Formulário | RHF + Zod | novo protocolo, motivo de encerramento, pergunta à coordenação, nota |
| Global UI | Zustand | tema (template), preferências de densidade, papel simulado (só DEV) |
| Local | `useState` | hover, expansão de linha |

**Mutations otimistas** onde o usuário decide em sequência (decisão de item, aceite em lote): atualizar
o cache, enviar com `If-Match`, reverter e avisar em erro/409. Invalidar `funil` e `lista` após
transições de etapa.

**Atualização em tempo quase real:** polling de 30 s na lista e no funil (`refetchInterval`) com
`refetchIntervalInBackground: false`; o contrato prevê `GET /eventos/stream` (SSE) para o TI ligar
depois sem mudar a UI.

## 4. Contrato e mocks

- **Contrato:** `contracts/openapi.yaml` (OpenAPI 3.1). Envelope de resposta igual ao do template:
  `ApiResponse<T> = { success, data, message? }` e erro `ApiErrorResponse`.
- **Schemas Zod** em cada feature espelham o contrato e fazem `.parse()` dentro da `queryFn` (padrão
  do template). Se divergir, o erro aparece no boundary.
- **MSW** (`msw`, adicionar como devDependency) com `VITE_USE_MOCKS=true` no `.env.local`. O
  `main.tsx` inicia o worker antes de renderizar quando a flag está ativa.
- **Seed determinística** (PRNG com semente fixa, nunca `Math.random`): ~300 casos distribuídos pelas
  etapas, 4 tipos, 8 cursos, 6 analistas, 3 pessoas de matrícula, 8 coordenadores; matrizes com 40–50
  disciplinas por curso; históricos de origem coerentes com a matriz; casos atrasados, pausados,
  com ouvidoria, com pré-análise falha e com reanálise. **Nomes e CPFs fictícios gerados** (CPF com
  dígito verificador válido, mas inventado). Selo "Dados fictícios" sempre visível.
- Os handlers do MSW **aplicam a máquina de estados e as permissões** (mesmo código de `domain/`), para
  que o comportamento simulado seja o comportamento esperado do backend.
- Seletor de papel (só DEV) troca o usuário simulado; `GET /me` responde conforme o papel.
- Latência simulada de 150–600 ms (determinística) para exercitar skeletons.

## 5. Integrações (todas no backend, atrás do contrato)

| Sistema | Para quê | Recursos do contrato | Status |
|---|---|---|---|
| SSO Intranet | Autenticação | `/funcionarios/me` (template) + `/me` (papéis) | existe |
| ERP acadêmico | Pessoa, vínculo, histórico interno, matrizes, efetivação | `/pessoas/lookup`, `/matrizes`, `EFETIVAR_MATRICULA` | **[TI]** |
| Endpoint de IA | Pré-análise | `/casos/{id}/pre-analise` | existe (adaptador) |
| GED | Guarda de documentos | `/casos/{id}/documentos` | existe ("Análise já no GED") |
| Blip | WhatsApp ativo e receptivo | `/casos/{id}/mensagens`, webhook | existe (integração nova) |
| Financeiro | Condição da proposta, pendências | `/casos/{id}/proposta` | **[TI]** |
| Vestibular | "Dados vest." | `/pessoas/{id}/vestibular` | existe no sistema atual |
| E-mail/Teams | Notificação de coordenadores | backend | **[VALIDAR canal]** |
| CRM de leads | Origem do candidato, consultor | futuro | — |

## 6. Qualidade e build

- Gates por fase: `npm test`, `npm run typecheck`, `npm run lint`, `npm run format`, `npm run build`.
- Testes obrigatórios: máquina de estados (todas as transições e guardas), permissões, SLA (horas
  úteis, pausa, feriado), prioridade, format, handlers de mock críticos, componentes de linha da fila,
  segmented de decisão e card Próximo passo.
- Acessibilidade: navegação completa por teclado na fila, nas abas e na grade.
- Performance: fila virtualizada; grade de análise com até 80 itens sem travar (memoização por linha).
- Adicionar `src/mocks` e dependências novas aos chunks do `vite.config.ts` só se fizer sentido; o MSW
  não pode entrar no bundle de produção (import dinâmico condicionado à flag).
- O README do template descreve um pipeline **GitLab CI** (o arquivo `.gitlab-ci.yml` não veio no zip
  do template); este repositório está no **GitHub**. Não criar pipeline de deploy sem confirmar com o
  TI onde será publicado. Um workflow de CI só de qualidade (lint, typecheck, test, build) no GitHub
  Actions é bem-vindo.


## Atualização operacional · 13/10/2026

Fases 0–8 concluídas na entrega inicial. Reformulação autorizada: tabela horizontal com protocolos separados, página inteira por análise, oito filas coloridas, acesso comum, busca por aluno e curso/oferta à vista. MAT é independente da etapa. As referências anteriores a papéis descrevem responsabilidades e não restringem ações humanas. docs/04, docs/05 e ADR-011 prevalecem sobre descrições de mestre-detalhe e limitações por papel. Preservar guardas, motivos, aceite e concorrência.
