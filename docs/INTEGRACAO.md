# Integração · como plugar a API real no front de Análises

> Para o time de TI. O front está completo e roda hoje com dados simulados (MSW). Este documento diz
> o que muda para ele falar com o backend de verdade, o que o backend precisa implementar e onde estão
> as decisões ainda abertas.

## 1. Desligar os dados simulados

1. Em `.env.production` (e no `.env.local` de quem desenvolve contra a API), troque
   `VITE_USE_MOCKS=true` por `VITE_USE_MOCKS=false`.
2. Confira `VITE_API_URL` (hoje `/analises/api/v1/`) e `VITE_LOGIN_URL` (SSO). O proxy do Vite em
   desenvolvimento aponta `/analises/api/v1` para `http://localhost` (`vite.config.ts`).
3. Pode apagar `public/mockServiceWorker.js` e a pasta `src/mocks` quando a API estiver no ar; o
   `main.tsx` só importa os mocks quando a flag está ligada (import dinâmico).

Interface com acesso comum e sem seletor de papel nem textos de demonstração. GET /me mantém identidade para autoria e notificações.

## 2. Contrato

A fonte de verdade é [`contracts/openapi.yaml`](../contracts/openapi.yaml) (OpenAPI 3.1, versão 0.3.0).
Os schemas Zod de cada feature (`src/features/*/types/*.schema.ts`) espelham o contrato e fazem
`.parse()` em toda resposta: se a API divergir, o erro aparece no ponto de entrada, com o campo errado.

Convenções que o backend precisa seguir:

- Envelope do template: `{ success: true, data, message? }`; erro `{ success: false, error: { code, message, detalhes?, atualizadoPor? } }`.
- `detalhes` traz as mensagens prontas para a interface (ex.: guardas de uma transição recusada, 422).
- Concorrência: mutations de caso mandam `If-Match: <caso.versao>`; mutations da análise mandam
  `If-Match: <analise.versao>`. Versão divergente responde **409** com `atualizadoPor`; o front
  recarrega e não sobrescreve.
- `caso.acoesDisponiveis` é a lista FINAL de ações do usuário naquele caso, cada uma com `habilitada`
  e `motivos`. Inclui transições, capacidades sem mudança de etapa (`DECIDIR_ITEM`, `VER_FINANCEIRO`,
  `REVELAR_CPF`, `ENVIAR_MENSAGEM`…) e `ASSUMIR`. O front só desenha e explica; o backend decide.
- Dados sensíveis chegam mascarados conforme o papel; `GET /casos/{id}/dados-sensiveis/{campo}`
  revela e grava log de acesso.

### Extensões feitas durante a implementação (já no YAML)

| Recurso | Para quê |
|---|---|
| `GET /casos/{id}/analise/previa-matriz?matriz=` | prévia de "Trocar matriz" (mapeadas, a revisar, sem correspondência) |
| `POST /casos/{id}/analise/itens:lote` com `modo: REVERTER` | "Desfazer" do aceite em lote (10 s) |
| `GET /pessoas/{id}/vestibular` | aba Dados, "Dados do vestibular" |
| `ItemAnalise.ementa`, `ItemChecklist.sensivel`, `botoes` na prévia, `Proposta.enviadaEm`, `Indicador.meta/detalhe` | campos de exibição |
| Respostas de pergunta e de coordenação devolvem `{ item, resumo, versao }` | manter a versão da análise em sincronia |

## 3. A regra mora no domínio compartilhado

`src/features/casos/domain/` tem código puro e testado que o backend deve reproduzir (ou reaproveitar,
se for TypeScript):

- `caso.machine.ts`: etapas, transições, guardas com as mensagens da interface, quem pode e destinos.
- `permissoes.ts`: matriz de capacidades por papel e escopo (docs/04).
- `sla.ts`: prazos em horas úteis com feriados e pausa; `prioridade.ts`: ordem da fila e "Pegar próximo".
- `parametros.ts`: todo número de negócio (docs/15). Vários são **[proposta]**: ver §6.

O backend simulado (`src/mocks/db/casos.ts`) mostra os efeitos colaterais esperados de cada transição
(distribuição por menor carga, régua de mensagens, congelamento do resumo, pré-análise automática).

## 4. Integrações que ficam no backend

| Sistema | O front chama | O backend faz |
|---|---|---|
| SSO | `GET /funcionarios/me` (template) e `GET /me` (papéis, cursos coordenados) | sessão por cookie; 401 leva ao SSO |
| IA de pré-análise | `GET/POST /casos/{id}/pre-analise`, `GET /casos/{id}/analise` | adaptador do endpoint atual para o nosso contrato (docs/07 §2); roda sozinho em `documentos.completos`, histórico migrado e `ALTERAR_DESTINO`; nunca decide |
| Blip (WhatsApp) | `GET /comunicacao/templates`, `POST /casos/{id}/mensagens/previa`, `POST /casos/{id}/mensagens`, `POST /casos/{id}/documentos:solicitar` | envia template aprovado, guarda a mensagem, recebe respostas por webhook (`mensagem.recebida`, `REGISTRAR_RESPOSTA` pelo sistema) |
| GED | `GET/POST/PATCH /casos/{id}/documentos`, `GET .../arquivo/{id}` | URL temporária para visualizar; log `documento.visualizado` |
| ERP acadêmico | `GET /pessoas/lookup`, `GET /matrizes`, `POST /casos/{id}/historico-interno:migrar`, `EFETIVAR_MATRICULA` | vínculo, histórico interno, matrizes e efetivação |
| Financeiro | `GET /casos/{id}/proposta` | condição financeira (só para `VER_FINANCEIRO`) e pendência anterior |
| Notificações | `GET /notificacoes`, `POST /notificacoes/{id}:lida` | inclusive avisos de SLA; e-mail/Teams para coordenação **[VALIDAR canal]** |
| Telemetria | `POST /telemetria` (lote, sem dado pessoal) | **[VALIDAR destino]** |

Atualização quase em tempo real: hoje o front faz polling de 30 s (`UI.pollingMs`) na fila, funil,
caso, linha do tempo e notificações. `GET /eventos/stream` (SSE) está no contrato para substituir o
polling depois sem mudar a interface.

## 5. Qualidade

`npm test` (Vitest, inclui teste de integração da tela inteira contra o MSW), `npm run typecheck`,
`npm run lint` (com as regras de camada do `eslint-plugin-boundaries`), `npm run format` e
`npm run build`. O README do template descreve o pipeline; um workflow só de qualidade no GitHub
Actions pode rodar esses cinco comandos.

## 6. Pendências [VALIDAR] consolidadas

**Negócio (Bianca, Secretaria, Regimento)**
- SLA de 24 h da coordenação: horas úteis ou corridas; escalonamento para quem (docs/03 §6).
- Demais SLAs, réguas e distribuição: todos marcados como [proposta] em `parametros.ts`.
- Checklist de documentos por tipo (docs/15 §4) e regras da análise (CH mínima 75%, validade, soma de origens, definições de DP e ADAP).
- Heurística de período de ingresso sugerido e de previsão de semestres (sempre rotulada como estimativa).
- Avisos de SLA: uma vez por caso e tipo, ou uma vez por passagem pela etapa (implementado: por passagem).
- Lista de atividades complementares (`ATIVIDADES_COMPLEMENTARES` é provisória).
- Redação das mensagens de recusa de documento por motivo (com Marketing, junto com os templates).

**TI**
- Formato do endpoint atual da IA (exemplo anonimizado) para escrever o adaptador.
- Coleta de documentos: WhatsApp (bot) ou link de upload; formatos e limite do GED (`ANEXO`: PDF ou imagem até 20 MB).
- Regra de opt-in de WhatsApp e aprovação dos templates; saldo de disparos no Blip.
- Canal de notificação da coordenação (e-mail, Teams); destino de `/telemetria`.
- Ciclos abertos (`CICLOS_ATIVOS`) e feriados vindos de `GET /parametros`.
- Catálogo de ementas da origem (`ItemOrigem` não traz ementa), `DELETE` de prática extensionista e histórico de uma regra de equivalência.
- Data do aceite registrada no fuso do navegador (deveria ser normalizada para São Paulo no backend).

**Jurídico e DPO**
- Base legal e retenção de documentos de quem não se matriculou (docs/11).
- Migração dos status antigos (docs/03 §10) e conferência dos "Liberadas matrícula" antes de migrar.


## 7. Contrato da reformulação (13/10/2026)

- CasoResumo exige criadoEm, matriculado e liberadoMatriculaEm. Matrícula é vínculo do aluno no ERP, coerente entre protocolos. Não inferir de RA ou etapa. Liberação é a última entrada em pronto para matrícula, ou null.
- etapa aceita etapa individual ou grupo NOVAS, LIBERADAS, CONCLUIDAS e TODAS. Funil devolve também rascunhos, adiados e desfechos para contagens. Grupos em docs/05.
- curso aceita ID ou parte do nome sem acentos. turno aceita DIURNO (presenciais diferentes de noturno). SEMIPRESENCIAL aparece como Híbrido.
- q atravessa etapas, inclui encerrados e mantém filtros explícitos de curso, oferta, tipo e ciclo. Resultados seguem por protocolo e paginação.
- Dados sensíveis seguem mascarados por padrão. Guardas, motivos, aceite e If-Match continuam obrigatórios para todos.


## 8. Gestão comercial e matriz curricular (14/10/2026) [VALIDAR com o TI: ainda fora do YAML]

- `GET /gestao/equipe?mes=AAAA-MM` (só `GESTAO`): `{ mes, mesesDisponiveis, consultores[], geradoEm }`. Cada consultor traz meta e `versaoMeta`, matrículas (total e por dia do mês até hoje), protocolos abertos, propostas enviadas, análises concluídas (denominador da conversão), mediana do primeiro contato, carteira ativa por etapa e histórico de seis meses. Schema em `src/features/gestao/types/gestao.schema.ts`.
- `PUT /gestao/metas` com `If-Match: versaoMeta` e corpo `{ consultorId, mes, meta }`: 409 se a meta mudou, 422 para mês fechado ou meta fora de 0 a 200.
- `GET /indicadores` passa a responder 403 para quem não é `GESTAO`.
- Protocolo é um número sequencial de cinco dígitos (ex.: `85560`), sem prefixo nem ano.
- `GET /matrizes-curriculares?q=&modalidade=&turno=` e `GET /matrizes-curriculares/:id`: busca por nome ou código do curso e currículo com disciplinas por período e por grupo. O código do curso segue presencial N, híbrido 2000 + N e EAD 7000 + N (ex.: Administração 8, 2008 e 7008); se houver exceções, o código deve vir do sistema acadêmico. Schema em `src/features/matriz-curricular/types/matriz.schema.ts`.
- Tipo novo `APROVEITAMENTO_ESTUDOS` e etapa final nova `CONCLUIDO`: `CONCLUIR_ANALISE` leva a `CONCLUIDO` nesse tipo (sem matrícula, sem proposta). Checklist em `docs/15` §4.
- `GET /casos`, `GET /casos/funil` e a exportação aceitam `processo=INGRESSO|TRANSFERENCIA_INTERNA|APROVEITAMENTO`. O funil devolve também `processos[]` (`total`, `emAndamento`, `atrasados`) sem o filtro de processo, para os cartões.
- Reabertura: `POST /casos/:id/transicoes` com `SOLICITAR_REANALISE` aceita `destinoReanalise` (`ANALISE` | `COORDENACAO`) e `itemIds`; vale também a partir de `CONCLUIDO`. `ItemAnalise.contestacao` (`texto`, `por`, `em`) marca as disciplinas contestadas.
- Parecer da coordenação: ao responder um item, o backend registra um evento `coordenacao.parecer` (categoria `NOTA`) com o parecer e o fundamento, que aparece nas observações.
- `GET /me` devolve `acesso` (`TODOS` | `GESTAO` | `COORDENACAO`).
- `ItemOrigem.codigo`: código da disciplina como está no histórico de origem (conferência lado a lado). As disciplinas de origem de instituições diferentes viram abas, pelo campo `ies`.

## 9. Link de acompanhamento do aluno (16/10/2026) [VALIDAR com o TI: ainda fora do YAML]

- Ao criar o protocolo, o backend gera um token aleatório e não adivinhável (não é id, CPF nem protocolo) e o devolve em `CasoDetalhe.tokenAcompanhamento`. A equipe copia o link `{origem}{VITE_BASE_URL}acompanhe/{token}` na faixa azul do caso.
- `GET /publico/acompanhamento/:token` responde **sem sessão** (nada de 401 nem redirecionamento ao SSO) com `{ protocolo, primeiroNome, tipo, curso, situacao, aguardandoAluno, passos[], ra, atualizadoEm }`. 404 para token inexistente ou revogado. Schema em `src/features/acompanhamento/types/acompanhamento.schema.ts`.
- A tradução etapa interna → passo do aluno está em `montarAcompanhamento` (`src/features/acompanhamento/domain/acompanhamento.ts`, testada). Coordenação, ajuste, pré-análise e responsáveis não saem; o RA só sai depois de `MATRICULADO`. CPF, celular e e-mail nunca saem.
- A rota pública fica fora do `AuthProvider`: a página do aluno não consulta `/me`.
- Recomendações: limitar requisições por IP no endpoint público, permitir revogar ou trocar o token e registrar acessos no log.
- No simulado (MSW) cada aba tem o próprio banco; a resposta pública é espelhada no `localStorage` para a aba do aluno enxergar o que a equipe fez em outra aba. Isso some com a API real.
