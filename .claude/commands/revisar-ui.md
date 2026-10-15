---
description: Revisa telas/componentes contra o visual híbrido (template + DS)
argument-hint: caminho opcional (arquivo ou pasta)
---

Revise $ARGUMENTS (se vazio: os arquivos alterados nesta sessão) contra `docs/14-decisoes-de-design.md`,
o checklist §16 e os anti-padrões §14 de `docs/design/DESIGN_SYSTEM.md`. Liste violações com arquivo e
linha e corrija. Verifique no mínimo:

- Card/painel sem `border` e sem `shadow` (contraste de superfície); hairline só como divisor.
- Uma ação primária por tela; botões em pílula; alturas do DS.
- Status = ponto + palavra; estado saudável sem ponto; vermelho só para o nível mais urgente.
- Nada de `font-bold`, caixa alta, `transition-all`, `hover:scale`, emoji, hex no componente.
- Mono só em valor alinhado (RA, protocolo, SLA, contagem, data em lista).
- `whileTap={press}` em clicáveis; `layoutId` único por instância; saída mais rápida que entrada.
- Claro **e** escuro; foco visível; `aria-label` em botão de ícone; teclado funciona.
- Estados carregando/vazio/erro desenhados com `AsyncState`; vazio explica o porquê e a saída.
- Classes do DS traduzidas (`bg-workspace`, `bg-card`).
