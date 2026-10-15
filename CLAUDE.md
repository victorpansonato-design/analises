# CLAUDE.md · Projeto Análises (UniAnchieta)

Memória do projeto para o Claude Code. Vale para toda sessão neste repositório.

## O que é

Sistema interno que substitui o módulo "Análises" da Central Acadêmica: transferência externa,
portador de diploma, transferência interna e retorno ao curso, do protocolo até a matrícula.
Uma **tela única** (`/analises`) para todos os papéis. Base técnica: **template React da Anchieta**.
Futuro: virar o "hub da captação" (CRM, vestibular, bolsas entram como módulos).

Dona do produto: **Bianca Lessa** (Customer Experience, Grupo Anchieta).

## Decisões atuais · 14/10/2026

- Acesso comum; papéis indicam responsabilidades e não bloqueiam ações humanas. Única exceção: a área
  `/gestao` (indicadores, rendimento e metas da equipe de vendas) é só do papel `GESTAO` (Hellen Bueno).
- Uso exclusivamente desktop (PC). Não desenvolver nem validar versões mobile ou tablet; ver AGENTS.md.
- Tabela horizontal, uma linha por protocolo, e página inteira para cada análise. Sem alunos ao lado do detalhe.
- Três acessos: Todos, Gestão comercial e Coordenadores (este ainda igual a Todos). Tema só no canto
  superior direito, com a revelação circular.
- Quatro processos coloridos acima das filas (Todos, Ingresso = externa + portador + retorno,
  Transferência interna e Aproveitamento de estudos), todos na cor forte; oito filas coloridas e MAT.
  Aproveitamento de estudos termina na análise (`CONCLUIDO`), sem proposta nem matrícula.
- Reabrir análise (após proposta ou aproveitamento concluído) volta para a equipe ou para a coordenação,
  com as disciplinas contestadas. Coordenadores entram por `/pareceres`; o parecer vai para as observações.
- Conferência lado a lado: histórico anexado × matriz, com a IA grifando no histórico o que está em dúvida.
- Matriz Curricular (`/matriz-curricular`): busca por nome ou código do curso (presencial N, híbrido
  2000 + N, EAD 7000 + N) e currículo por período e por grupo. Protocolo é número de 5 dígitos (`85560`).
- Curso digitável e oferta à vista; busca de aluno encontra protocolos em todas as etapas.
- Manter dados inventados; remover textos de demonstração da interface.
- Não fazer commits sem solicitação. Guardas, motivos, aceite, máscaras e concorrência continuam obrigatórios.
- docs/05 e docs/04 são a especificação vigente. PRODUCT.md e DESIGN.md registram propósito e direção visual.

## Leia antes de codar (nesta ordem)

1. `docs/00-visao-geral.md` · 2. `docs/14-decisoes-de-design.md` · 3. `docs/03-maquina-de-estados.md` ·
4. `docs/05-ux-tela-unica.md` · 5. a fase atual em `docs/12-roadmap-e-backlog.md` · e os documentos que a fase citar.
Do template: `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `TESTING.md`, `DESIGN-SYSTEM.md`.
Design system complementar: `docs/design/DESIGN_SYSTEM.md` (perfil simples, §18).

## Regras de trabalho

- **Na dúvida, pergunte.** Regra de negócio ambígua, conflito entre documentos ou dependência nova:
  pare e pergunte à Bianca. Nunca invente regra; transforme em parâmetro (`docs/15-parametros.md`).
- **Trabalhe por fase** (`docs/12`). Ao fim de cada fase: gates verdes, resumo curto e o que testar;
  respeite o escopo autorizado pelo usuário para continuar.
- **Gates:** `npm test` · `npm run typecheck` · `npm run lint` · `npm run format` · `npm run build`.
- Não fazer commits sem solicitação explícita.

## Regras de arquitetura (do template — não quebrar)

- Bulletproof React com camadas `app → feature → shared` validadas por `eslint-plugin-boundaries`.
- Feature só importa outra pelo `index.ts`. `components/ui` é só shadcn; primitivos do DS em `components/core`.
- Servidor = TanStack Query (com `.parse` Zod na `queryFn`); URL = search params; formulário = RHF + Zod;
  UI global = Zustand; local = `useState`. **Nunca** dado de servidor no Zustand.
- `AsyncState` para loading/erro/vazio (nunca ternário manual). Motion via `motion/react`.
- Sem `enum` de TypeScript (`erasableSyntaxOnly`): `as const` + `z.enum`.
- Domínio puro e testado em `src/features/casos/domain/` (máquina, permissões, SLA, prioridade, parâmetros).
- Mocks: MSW em `src/mocks`, só com `VITE_USE_MOCKS=true`, import dinâmico, seed determinística.

## Regras visuais (resumo — detalhes em `docs/14`)

- Identidade do template (azul OKLCH, amarelo só como assinatura, Inter + JetBrains Mono).
- Composição e movimento do DS: card sem borda e sem sombra, hairline só divide, 12 px de raio,
  botão pílula, **uma ação primária por tela**, sombra só em overlay, status = ponto + palavra.
- Pesos 400/500/600 (nunca `font-bold`), sentence case (nunca caixa alta), mono só para valor alinhado.
- `transition-colors` (nunca `transition-all`), `whileTap={press}`, nada de `hover:scale`.
- Tradução de classes do DS: `bg-canvas` → `bg-workspace`, `bg-surface` (card) → `bg-card`.
- Sem emoji na interface. Ícones só `lucide-react`.

## Texto e dados

- Interface em **português do Brasil**. **Não usar vírgula antes do "e"** no último item de listas.
- Números e datas sempre por `lib/format.ts` (pt-BR).
- **Nunca** use dados reais (nomes, RA, CPF, telefone, e-mail) em código, mocks, testes, commits ou
  prints. As capturas do sistema antigo têm dados reais: só referência visual.
- CPF mascarado por padrão; revelar gera log. Ver `docs/04` §3 e `docs/11`.
- Taxa nunca sem denominador. Previsão de semestres sempre rotulada como estimativa.
