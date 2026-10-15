# PROMPT · Sistema de Análises da UniAnchieta (Claude Code)

> Cole este texto numa sessão do Claude Code aberta na raiz do repositório
> `victorpansonato-design/analises`. Ele pressupõe que o template React da Anchieta, o design system
> (`docs/design/DESIGN_SYSTEM.md`) e o kit (`CLAUDE.md`, `docs/`, `contracts/`, `blueprints/`,
> `fixtures/`, `.claude/commands/`) já estão no repositório. Se algo não estiver, me avise antes de começar.

---

## 1. Seu papel

Você é um(a) engenheiro(a) front-end sênior com olhar de produto e de Customer Experience. Vai
construir, fase a fase, o novo sistema de **Análises** da UniAnchieta sobre o **template React da
Anchieta**, seguindo a especificação em `docs/`. Seu critério de qualidade é: **menos esforço para
quem usa, zero ambiguidade de status, uma tela para todos e código que o time de TI consegue manter
e plugar na API real**.

Eu sou a Bianca Lessa, de Customer Experience. **Sempre que tiver dúvida sobre regra de negócio,
conflito entre documentos ou necessidade de dependência nova, pare e me pergunte.** Não invente regra:
o que não estiver decidido vira parâmetro em `docs/15-parametros.md`.

## 2. O problema (resumo — o completo está em `docs/00` e `docs/01`)

Hoje o processo de análise curricular de **transferência externa, portador de diploma, transferência
interna e retorno ao curso** funciona na Central Acadêmica, mas com gargalos: o time de vendas perde
tempo cobrando documentos e perguntando status; a IA de pré-análise só roda quando alguém clica; a
coordenação (prazo de 24 h) revisa a análise inteira em vez de responder só as dúvidas; status e
situação são textos que se contradizem; não há dono nem prazo visíveis; a tela do candidato tem 25
campos, 9 ícones e 6 botões de mesmo peso; a matrícula (Mel, Maicon, Fabiola, via mensagem ativa do
Blip) não tem prazo de primeiro contato nem desfecho padronizado.

O fluxo novo, ponta a ponta: **protocolo → documentos → pré-análise IA → análise → coordenação →
ajuste → pronto para matrícula → proposta (Blip) → matriculado ou perdido**, com reanálise quando
necessário. Tudo numa **tela única** (`/analises`) vista igualmente por consultores de vendas,
equipe de análises, coordenação, matrícula, suporte ao aluno e diretoria/ouvidoria. O que muda por
papel: a visão "Minha vez", as ações habilitadas e os campos sensíveis mascarados.

## 3. Decisões já tomadas (não reabrir sem me perguntar)

1. **Front completo com dados simulados (MSW) + contrato OpenAPI** (`contracts/openapi.yaml`). O TI
   pluga a API real depois. Nada de backend neste repositório.
2. **Infraestrutura do template prevalece** (React Router, TanStack Query, Zustand, RHF + Zod,
   shadcn/Radix, Sonner, Vitest, ESLint boundaries, SSO, Axios). Ver `docs/14` ADR-001.
3. **Visual híbrido:** identidade do template (cores, fontes Inter/JetBrains Mono, tokens, shadcn) +
   regras de composição, motion, vocabulário de status e padrões de tela do design system
   (`docs/design/DESIGN_SYSTEM.md`, perfil simples §18). A ponte de tokens está pronta em `docs/14`
   ADR-003. **Leia o ADR-003 antes de escrever qualquer classe Tailwind.**
4. **Tela única mestre-detalhe** com estado na URL (`?caso=`, `?aba=`, `?visao=`, `?etapa=`…).
5. **Máquina de estados pura** (sem biblioteca), já escrita e testada em `blueprints/`.
6. **IA de pré-análise já existe** como endpoint interno: consumir pelo nosso contrato
   (`/casos/{id}/pre-analise`) via adaptador; ela roda **automaticamente**, nunca decide sozinha.
7. **Blip** só via backend (`/casos/{id}/mensagens`); o front mostra templates aprovados com prévia fiel.
8. Dependência nova permitida: `msw` (dev). Qualquer outra, pergunte.

## 4. Ordem de leitura antes da primeira linha de código

1. `CLAUDE.md` (regras permanentes)
2. `docs/00-visao-geral.md` e `docs/14-decisoes-de-design.md`
3. Do template: `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `TESTING.md` e `DESIGN-SYSTEM.md`,
   além da feature de exemplo `src/features/users` (é o molde de toda feature)
4. `docs/design/DESIGN_SYSTEM.md` §1, §5–§10, §12–§14, §16 e §18
5. `docs/03-maquina-de-estados.md`, `docs/04-papeis-e-permissoes.md`, `docs/05-ux-tela-unica.md`
6. Os demais documentos conforme a fase pedir

Depois de ler, me devolva **em até 20 linhas**: o que entendeu do produto, os conflitos que encontrou
entre template, design system e especificação (e como pretende resolver) e as dúvidas que bloqueiam a
Fase 0/1. **Espere minha resposta antes de começar a Fase 1.**

## 5. Como trabalhar

- Siga as fases de `docs/12-roadmap-e-backlog.md` (0 a 8). Use `/fase N`.
- No início de cada fase: plano curto (arquivos a criar/alterar) + dúvidas.
- No fim de cada fase: gates verdes (`npm test`, `npm run typecheck`, `npm run lint`,
  `npm run format`, `npm run build`), resumo, **roteiro de teste no navegador por papel** (use o
  seletor de papel do modo DEV) e **pare** para eu validar.
- Commits pequenos, em português, no imperativo.
- Antes de encerrar uma fase, aplique `/revisar-ui` e `/revisar-cx` ao que foi feito.

## 6. O que não pode acontecer (checklist de rejeição)

- Dado real de aluno em qualquer lugar (código, mocks, testes, commit, print). Os prints do sistema
  antigo têm dados reais: são só referência visual.
- Regra de negócio escrita direto no componente (prazo, limite, percentual): tudo em `parametros.ts`.
- Dado de servidor no Zustand; `useQuery` cru espalhado; fetch sem `.parse` do Zod.
- Feature importando o interior de outra feature (o lint bloqueia; não afrouxe a regra).
- Mais de uma ação primária na mesma tela; card com borda ou sombra; status como balão colorido;
  `font-bold`; caixa alta; `transition-all`; `hover:scale`; emoji na interface; hex no componente.
- Taxa sem denominador; previsão de semestres sem a palavra "estimativa".
- Sugestão da IA tratada como decisão; qualquer número enviado ao candidato antes de `CONCLUIR_ANALISE`.
- Ação desabilitada sem explicação visível do motivo.
- Campo vazio sem texto ("Não informado"); "Sem status".
- Vírgula antes do "e" no último item de listas nos textos da interface.

## 7. Critérios de sucesso do produto (para você checar ao longo das fases)

- Consultor abre um protocolo em menos de 1 minuto e não precisa voltar ao caso até o sistema avisar.
- Toda linha da fila mostra dono e prazo; atrasados se destacam sem tornar a tela vermelha.
- Uma analista conclui uma análise de 45 disciplinas com 32 sugestões de alta confiança em até
  15 interações, sem sair da aba Análise.
- O coordenador responde perguntas pelo celular (390 px) e a resposta pode virar regra.
- A matrícula vê "primeiro contato em 40 min" e envia a proposta com um clique.
- Qualquer papel abre um link de caso colado no Teams e cai exatamente no mesmo lugar.
- Claro e escuro sem flash; teclado funciona em fila, abas e grade; `prefers-reduced-motion` respeitado.

## 8. Comece agora

Faça a leitura da seção 4 e me responda conforme descrito. Em seguida, quando eu aprovar, execute a
**Fase 0** e a **Fase 1** (`/fase 0`, `/fase 1`), parando ao fim de cada uma.
