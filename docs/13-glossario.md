# 13 · Glossário

> Definições usadas no sistema. Os termos marcados **[VALIDAR]** devem ser conferidos com a equipe de
> análises e a Secretaria antes de virar texto de ajuda na interface.

| Termo | Definição no sistema |
|---|---|
| **Caso** | Um processo de análise de uma pessoa para um curso de destino, num ciclo. Tem protocolo, etapa, responsável e SLA. |
| **Protocolo** | Identificador humano do caso (`85560`: número sequencial de 5 dígitos). |
| **Etapa** | Posição do caso na máquina de estados (`03`). Substitui "Status" e "Situação". |
| **Responsável** | Pessoa dona do caso na etapa atual. Pode mudar entre etapas. |
| **SLA** | Prazo da etapa. Estados: no prazo, atenção, estourado, pausado. |
| **Pendência externa** | Espera justificada (edital de DP, vaga, documento da IES de origem) que pausa o SLA até uma data. |
| **Tipo de solicitação** | Transferência externa, Portador de diploma, Transferência interna, Retorno ao curso. |
| **Matriz (currículo)** | Conjunto de disciplinas do curso de destino, por período, num ano/versão (ex.: `20262`). |
| **Item da matriz** | Uma disciplina da matriz de destino que precisa de decisão na análise. |
| **Origem** | Disciplina(s) cursada(s) pelo candidato que sustentam uma decisão. |
| **Dispensa** | A disciplina de destino é aproveitada (o candidato não precisa cursar). |
| **Regular** | O candidato cursa a disciplina normalmente, no período dela. |
| **DP** | Dependência: disciplina de período anterior ao de ingresso que o candidato cursará em regime de dependência **[VALIDAR definição exata]**. |
| **ADAP** | Adaptação: disciplina cursada para adequação curricular de quem vem de outra matriz/IES **[VALIDAR definição exata]**. |
| **CH** | Carga horária, em horas. |
| **Aproveitamento** | CH dispensada ÷ CH total da matriz de destino. |
| **Período de ingresso** | Período da matriz em que o candidato entra. |
| **Pré-análise** | Sugestão automática (IA + base de equivalências) para cada item da matriz. Nunca é decisão. |
| **Confiança** | Alta, Média, Baixa ou Regra (veio de decisão humana anterior). |
| **Equivalência (regra)** | Decisão reutilizável: disciplina X da IES Y equivale à disciplina Z da matriz W. |
| **Pergunta à coordenação** | Dúvida sobre um item específico enviada ao coordenador do curso de destino. |
| **Resumo congelado** | Versão da análise gravada no momento da conclusão; é o que vai para o candidato e para a matrícula. |
| **Proposta** | Resumo congelado + condição financeira + previsão de semestres, enviado ao candidato. |
| **Régua** | Sequência automática de mensagens com gatilho, intervalo e condição de parada. |
| **Template (Blip)** | Mensagem pré-aprovada pelo WhatsApp, obrigatória para contato ativo fora da janela de 24 h. |
| **Minha vez** | Visão da fila com os casos em que a próxima ação é do usuário logado. |
| **Pegar próximo** | Atribuir a si o caso sem responsável de maior prioridade. |
| **Atividades complementares** | Horas de atividades extracurriculares reconhecidas, com limite por atividade (hoje 60 h). |
| **Prática extensionista** | Horas de extensão exigidas pela matriz (ex.: 310 h). |
| **Migrar histórico** | Trazer para o caso as disciplinas do histórico interno (interna e retorno). |
| **Mudança de matriz** | Troca da matriz de destino do caso (antigo botão "Enviar mudança de matriz"). |
| **GED** | Gestão eletrônica de documentos, onde os arquivos ficam guardados. |
| **Ciclo** | Período letivo de ingresso (ex.: 2027.1). |
| **Hub da captação** | Visão futura: um shell único que reúne CRM, vestibular, análise, bolsas e matrícula. |
