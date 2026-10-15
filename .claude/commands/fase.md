---
description: Implementa uma fase do roadmap (ex.: /fase 3)
argument-hint: número da fase
---

Implemente a **Fase $ARGUMENTS** de `docs/12-roadmap-e-backlog.md`.

1. Releia `CLAUDE.md`, `docs/14-decisoes-de-design.md` e todos os documentos citados na fase.
2. Antes de codar, liste em até 10 linhas o plano da fase (arquivos que vai criar/alterar) e as
   dúvidas de regra de negócio. **Se houver dúvida que mude o resultado, pergunte e espere.**
3. Implemente em commits pequenos, seguindo o template (features, `index.ts`, Zod, React Query, URL state).
4. Escreva os testes da fase (domínio sempre; componentes críticos).
5. Rode os gates: `npm test`, `npm run typecheck`, `npm run lint`, `npm run format`, `npm run build`.
6. Rode `/revisar-ui` e `/revisar-cx` mentalmente sobre o que fez e corrija o que falhar.
7. Termine com: o que foi feito, como testar (passo a passo no navegador, com o papel simulado),
   pendências **[VALIDAR]** novas e **pare** para a validação da Bianca.
