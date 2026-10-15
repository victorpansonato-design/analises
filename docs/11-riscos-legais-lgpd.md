# 11 · Riscos legais, reputacionais, financeiros e de dados

> Os pontos legais abaixo são **referência para o produto** e **não substituem o Jurídico da
> instituição** nem o encarregado de dados (DPO). Tudo marcado **[VALIDAR]** precisa de confirmação
> antes de virar regra.

## 1. Legislação que toca o processo

| Norma | Ponto relevante para o sistema | Como o produto respeita |
|---|---|---|
| LDB (Lei 9.394/1996), art. 49 | Transferência de alunos regulares para **cursos afins**, havendo vaga, mediante processo seletivo. Leitura de apoio: [ABMES · A questão das transferências](https://abmes.org.br/colunas/detalhe/878/educacao-superior-comentada-a-questao-das-transferencias) | Campo de vaga e de afinidade de curso na transferência externa **[VALIDAR regra e fonte do dado de vagas]** |
| Portaria MEC 230/2007 (citada na mesma fonte ABMES) | A transferência se efetiva com histórico ou documento equivalente com disciplinas, carga horária e desempenho; a IES não pode exigir taxa de matrícula para analisar documentos de transferência | Checklist da externa pede histórico com CH e notas; **nenhuma cobrança antes da análise** aparece no fluxo |
| Lei 9.870/1999, art. 5º | Renovação de matrícula garantida a alunos já matriculados, salvo inadimplentes | Retorno com pendência financeira: o sistema **sinaliza** para a matrícula negociar; a análise acadêmica **não é bloqueada** **[VALIDAR com Jurídico]** |
| Lei 9.870/1999, art. 6º | Proibido reter documentos ou aplicar penalidade pedagógica por inadimplência; documentos de transferência devem ser expedidos | O sistema nunca condiciona emissão de documento à situação financeira |
| CDC (Lei 8.078/1990), art. 42 | Cobrança não pode expor a constrangimento ou ameaça | Templates sem tom de cobrança; régua com limite diário e horário |
| CDC — oferta vincula | O que é ofertado integra o contrato | Só o resumo **congelado** da análise é enviado; previsão de semestres rotulada como estimativa |
| LGPD (Lei 13.709/2018) | Princípios de finalidade, necessidade e segurança; base legal | Ver seção 2 |
| Lei 10.861/2004 (SINAES) | Autoavaliação (CPA) e Enade | Dados de CES/CSAT e motivos de perda podem alimentar a CPA (agregados) |
| Política do WhatsApp via Blip | Mensagem ativa fora da janela de 24 h exige template aprovado ([Blip](https://hmg-help.blip.ai/docs/en/channels/whatsapp/enviar-notificacao-whatsapp-blip-api)) | Só templates aprovados no compositor; opt-in registrado **[VALIDAR regra de opt-in com TI/Marketing]** |

**Portador de diploma:** as regras de ingresso e aproveitamento vêm do regimento/regulamento interno
da UniAnchieta **[VALIDAR com Secretaria]**. O sistema trata como parâmetros.

## 2. LGPD aplicada

- **Base legal provável:** execução de procedimentos preliminares a contrato, a pedido do titular
  (art. 7º, V), para dados do processo de análise **[VALIDAR com DPO]**.
- **Minimização:** CPF mascarado por padrão, revelação com log (ver `04` §3); exportações sem CPF
  completo para quem não pode revelar.
- **Documentos:** visualização com log de acesso (`documento.visualizado`); download só para quem precisa.
- **Retenção:** definir prazo de guarda de documentos de candidatos **não matriculados** (perdidos e
  cancelados) e rotina de descarte **[VALIDAR com DPO]**. O front exibe "Documentos descartados em
  dd/mm" quando aplicável.
- **IA:** processamento no serviço interno. Serviço externo exige avaliação do DPO e contrato antes.
- **Ambiente de desenvolvimento:** **proibido** usar dado real em mocks, testes, prints, commits,
  issues ou prompts. As capturas do sistema atual têm dados reais: servem só de referência visual.
- **Direitos do titular:** suporte ao aluno consegue localizar todos os casos de um CPF (⌘K) para
  atender pedidos de acesso/correção.
- **Telemetria de UI** sem dado pessoal (só ids técnicos).

## 3. Riscos e mitigação

| Risco | Tipo | Probabilidade | Mitigação |
|---|---|---|---|
| IA sugere dispensa indevida e ela passa no lote | Acadêmico / reputacional | Média | Lote só com `ALTA`/`REGRA`; amostragem de auditoria **[proposta: 5% dos lotes revisados pela coordenação]**; métrica de alteração |
| Candidato recebe previsão de semestres que não se confirma | Reputacional / CDC | Média | Resumo congelado; texto "estimativa, sujeita à oferta"; reanálise com motivo |
| Régua vira "spam" | Reputacional / Procon | Média | 1 automática por dia, horário comercial, para ao responder, "Não tenho interesse" encerra |
| Coordenação não adere ao SLA | Operacional | Alta no início | Perguntas curtas por item, mobile, notificação, escalonamento, painel de SLA visível |
| Equipe rejeita a tela nova | Operacional | Média | Vocabulário mantido, mapa antigo → novo, treinamento curto, período de convivência, ouvir a equipe na fase 3 |
| Dados de teste poluem indicadores | Gestão | Alta (já acontece) | Motivo `TESTE` exclui de indicadores; ambiente de homologação separado |
| Duas pessoas ligam para o mesmo candidato | CX | Média | Responsável único, presença no caso, timeline compartilhada |
| Status antigos mal migrados | Operacional | Alta | Tabela de migração (`03` §10) revisada com a equipe; revisão manual de "Sem status" |
| Integrações atrasam (ERP, financeiro, Blip) | Projeto | Alta | Front completo sobre contrato + MSW; integrações entram por adaptador sem mudar UI |
| Dependência de uma pessoa da matrícula | Operacional | Média | Distribuição configurável; "Minha vez" com casos sem responsável |
