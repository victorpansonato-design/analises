# 14 · Decisões de design e arquitetura (ADRs)

> Há **dois documentos de design** no projeto: o `DESIGN-SYSTEM.md` do **template** (raiz) e o
> `DESIGN_SYSTEM.md` do **Sucesso ao Aluno** (em `docs/design/`). Eles divergem. Este arquivo decide
> quem ganha em cada ponto. Em caso de conflito não coberto aqui: **pare e pergunte**.

## ADR-001 · A infraestrutura do template prevalece

**Decisão:** React Router (BrowserRouter com `basename`), TanStack Query, Zustand, RHF + Zod, shadcn/ui
+ Radix, Sonner, Vitest, ESLint com `boundaries`, Axios centralizado, SSO. Tudo como está no template.

**Ignorar do DS do Sucesso ao Aluno:** roteamento por hash, "nenhuma biblioteca de UI de terceiros",
"nenhuma biblioteca de data fetching", persistência em `localStorage` versionada como estado do app,
Geist, tokens em hex. Esses pontos valem para aquele projeto, não para este.

## ADR-002 · Visual híbrido

**Do template (identidade):** cores da marca (azul OKLCH e amarelo institucional), tokens semânticos
existentes, fontes **Inter** e **JetBrains Mono**, tema `light | dark | system` com chave `app-theme`,
componentes shadcn instalados, logo e shell.

**Do DS (composição, movimento e linguagem):**

1. As **seis regras** (§1): separação por contraste, hairline só como divisor, um raio de superfície
   (12 px) e pílula para ação, cor conquistada, sombra só em overlay, nada de material/vidro (perfil
   simples, §18).
2. **Motion spec** completo (§8): `lib/motion.ts`, durações, `whileTap={press}`, `layoutId`, saída mais
   rápida que entrada.
3. **Escala tipográfica** (§5) com pesos 400/500/600, sentence case, mono só para valores alinhados.
4. **Vocabulário de status** (§12): Status = ponto + palavra; Tag = chip quieto; estado saudável sem ponto.
5. Padrões **Tabela operacional** (§10.14), **Página de uma pessoa** (§10.15, a faixa azul de
   identidade), **Hint/Denominator** (§10.16), **MetricSheet** (§10.17), **Toaster** (§10.19),
   **Timeline** (§10.20), **formatação pt-BR** (§12) e **anti-padrões** (§14).
6. Checklist de revisão do DS (§16) vale para toda tela.

**Amarelo institucional:** só assinatura de marca (`.anchieta-rule` sob o título da tela, `::selection`).
Nunca status, nunca hover. Atenção: o `ghost` do botão do template usa `hover:bg-accent` (amarelo);
trocar para `hover:bg-surface-hover`.

## ADR-003 · Ponte de tokens (o DS fala; o template responde)

O template já usa `--surface` e `--canvas` com **outro sentido** do DS. Para não quebrar o shadcn,
**não redefinir** esses dois. Tradução obrigatória ao copiar classes do DS:

| O DS escreve | Neste projeto use | Significado |
|---|---|---|
| `bg-canvas` (fundo da página) | `bg-workspace` | Fundo mais escuro da área de trabalho |
| `bg-surface` (card) | `bg-card` | Superfície mais clara (painel, card) |
| `bg-surface-2`, `bg-surface-3`, `bg-surface-hover` | iguais (novos tokens) | Preenchimentos internos |
| `text-ink`, `text-ink-2`…`-4` | iguais (novos tokens) | Escada de texto |
| `border-hairline`, `divide-hairline` | iguais (novos tokens) | Divisores |
| `bg-brand`, `text-on-brand`, `bg-brand-soft`, `text-brand-text` | iguais (mapeados para o azul do template) | Marca |
| `bg-ok/warn/risk/crit`, `text-*-ink`, `bg-*-soft` | iguais (novos tokens) | Status |
| `shadow-overlay` | igual (novo token) | Só overlays |

Bloco para `src/index.css` (adicionar **depois** do `:root` e do `.dark` do template; ajustar valores
se o contraste AA de `--ink-2` sobre `--card` não passar):

```css
:root {
   --workspace: var(--shell);
   --ink: var(--foreground);
   --ink-2: oklch(36% 0.025 264);
   --ink-3: var(--muted-foreground);
   --ink-4: oklch(62% 0.018 264);
   --hairline: var(--border);
   --hairline-strong: var(--border-strong);
   --surface-2: var(--muted);
   --surface-3: oklch(93.5% 0.009 264);
   --surface-hover: oklch(97.5% 0.005 264);
   --brand: var(--brand-blue);
   --brand-hover: var(--brand-blue-strong);
   --brand-soft: var(--brand-blue-soft);
   --brand-text: var(--brand-blue);
   --on-brand: var(--primary-foreground);
   --ok: var(--ink-3);
   --ok-ink: var(--ink-2);
   --warn: oklch(62% 0.13 80);
   --warn-ink: oklch(46% 0.1 78);
   --warn-soft: var(--warning-soft);
   --risk: oklch(58% 0.14 60);
   --risk-ink: oklch(46% 0.12 58);
   --risk-soft: oklch(96% 0.03 70);
   --crit: var(--destructive);
   --crit-ink: oklch(48% 0.19 27);
   --crit-soft: var(--destructive-soft);
   --info: var(--brand-blue);
   --focus: var(--ring);
   --track: var(--border);
   --skeleton: oklch(94% 0.008 264);
   --scrim: oklch(18% 0.025 264 / 0.4);
   --shadow-overlay: 0 1px 2px oklch(18% 0.025 264 / 0.06), 0 8px 24px -6px oklch(18% 0.025 264 / 0.12),
      0 24px 56px -12px oklch(18% 0.025 264 / 0.14);
}

.dark {
   --ink-2: oklch(82% 0.01 264);
   --ink-4: oklch(52% 0.016 264);
   --surface-3: oklch(26% 0.026 264);
   --surface-hover: oklch(23% 0.026 264);
   --brand-text: oklch(78% 0.1 263.91);
   --warn: oklch(75% 0.12 80);
   --warn-ink: oklch(82% 0.1 85);
   --risk: oklch(72% 0.13 60);
   --risk-ink: oklch(80% 0.11 62);
   --risk-soft: oklch(26% 0.05 60);
   --crit-ink: oklch(76% 0.15 27);
   --skeleton: oklch(24% 0.025 264);
   --scrim: oklch(8% 0.02 264 / 0.66);
   --shadow-overlay: 0 1px 2px oklch(0% 0 0 / 0.5), 0 12px 32px -8px oklch(0% 0 0 / 0.6), 0 32px 64px -16px oklch(0% 0 0 / 0.7);
}
```

E no `@theme inline` do template, expor como cores do Tailwind: `--color-workspace`, `--color-ink`,
`--color-ink-2`, `--color-ink-3`, `--color-ink-4`, `--color-hairline`, `--color-hairline-strong`,
`--color-surface-2`, `--color-surface-3`, `--color-surface-hover`, `--color-brand`,
`--color-brand-hover`, `--color-brand-soft`, `--color-brand-text`, `--color-on-brand`, `--color-ok`,
`--color-ok-ink`, `--color-warn`, `--color-warn-ink`, `--color-warn-soft`, `--color-risk`,
`--color-risk-ink`, `--color-risk-soft`, `--color-crit`, `--color-crit-ink`, `--color-crit-soft`,
`--color-info`, `--color-focus`, `--color-track`, `--color-skeleton`, `--color-scrim` e
`--shadow-overlay`.

**Raios:** `--radius: 0.75rem` e, no `@theme inline`, `--radius-xs: 6px`, `--radius-sm: 8px`,
`--radius-md/lg/xl/2xl: var(--radius)` (todos 12 px). Botões, chips e segmented: `rounded-full`.

## ADR-004 · Shell da tela de trabalho

- Remover do `SidebarInset` do `MainLayout` a borda e a `shadow-elevated` (regras 1 e 5). O fundo da
  área de conteúdo vira `bg-workspace` (= `--shell`, mesmo tom da sidebar no template, então a moldura
  se funde). Os painéis (fila, caso, funil) são `bg-card rounded-xl` **sem borda**: contraste em claro
  (95,8% → 100%) e em escuro (12,5% → 20%).
- Sidebar recolhida por padrão na tela `/analises` (mais espaço para fila + caso).
- Header de 56 px do template mantido (não usar 74 px do DS): a tela é densa e cada pixel vertical
  conta. A zona da marca da sidebar acompanha 56 px.
- Validar no checkpoint da fase 1 com a Bianca (prints claro e escuro).

## ADR-005 · Pré-pintura do tema

O Zustand `persist` grava `{"state":{"theme":"dark"},"version":0}` na chave `app-theme`. O script do
`index.html` precisa ler `state.theme` (armadilha descrita no DS §9):

```html
<script>
   (function () {
      try {
         var raw = localStorage.getItem("app-theme");
         var t = "system";
         if (raw) {
            var p = JSON.parse(raw);
            t = (p && p.state && p.state.theme) || "system";
         }
         var dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
         var r = document.documentElement;
         r.classList.remove("light", "dark");
         r.classList.add(dark ? "dark" : "light");
         r.style.colorScheme = dark ? "dark" : "light";
      } catch (e) {}
   })();
</script>
```

## ADR-006 · Tela única com estado na URL

Mestre-detalhe numa rota (`/analises`), caso e aba em search params. Motivo: o "botão voltar" funciona,
links do Teams/e-mail abrem o caso exato e nenhum papel precisa de outra tela. Painel de indicadores
também é estado da mesma rota (`?painel=indicadores`).

## ADR-007 · Máquina de estados pura e compartilhada

Tabela de transições em TypeScript puro (sem biblioteca), usada pela UI (desenhar ações e explicar
bloqueios) e pelos handlers do MSW (simular o backend). O backend real é a autoridade e devolve
`acoesDisponiveis`. Sem XState: a tabela é pequena e explícita é mais fácil de revisar com o negócio.

## ADR-008 · Contrato primeiro + MSW

`contracts/openapi.yaml` é a fonte; Zod espelha; MSW simula. Nenhum componente conhece URL: tudo via
hooks de `api/` da feature (padrão do template). O MSW só carrega com `VITE_USE_MOCKS=true` e via
`import()` dinâmico.

## ADR-009 · Gráficos sem biblioteca

O template não tem biblioteca de gráficos e o DS usa SVG próprio (§11). Indicadores usam barras e
linhas em SVG simples com `role="img"` + `aria-label` e série publicada em texto. Se o volume de
gráficos crescer muito, reavaliar com a Bianca antes de adicionar dependência.

## ADR-010 · Dependências novas permitidas

`msw` (dev). Qualquer outra: perguntar antes. Já disponíveis e devem ser usadas: `react-virtuoso`
(fila), `cmdk` (⌘K), `date-fns` (datas e horas úteis), `motion`, `sonner`, `zod`, `react-hook-form`.


## ADR-011 · Reformulação operacional (13/10/2026)

Por instrução do usuário, substitui mestre-detalhe, navegação monocromática e acesso por papel: tabela horizontal com oito filas coloridas e página inteira por protocolo. Todos têm o mesmo acesso. Cores das filas e verde/vermelho de MAT são semânticos e permitidos onde documentos anteriores limitavam cores aos alertas. MSW continua, sem textos de demonstração na interface. URL, arquitetura de features, guardas por etapa, CPF mascarado, autoria e proteção de versão continuam. docs/05 e docs/04 descrevem o comportamento atual.
