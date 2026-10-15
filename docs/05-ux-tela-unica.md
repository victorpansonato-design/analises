# 05 · UX das análises

Atualizado em 13/10/2026 conforme orientação do usuário. Substitui o layout mestre-detalhe anterior.

## Listagem

Tabela horizontal ampla, uma linha por protocolo. Colunas: Perfil, MAT, Protocolo, RA, Nome completo, Curso e modalidade, Solicitação/etapa, Inclusão e Liberada matrícula. Sem Usuário e Próximo contato.

Perfil, clique na linha e link direto abrem a análise em tela inteira. URL mantém filtros e ID do caso. Voltar retorna à mesma busca e posição. Ctrl/clique no link pode abrir em outra aba. Todos têm o mesmo acesso. Responsáveis identificam quem acompanha o trabalho sem restringir ações. Guardas, motivo, aceite e versão continuam validados.

## Processos (14/10/2026)

Acima das filas, quatro cartões de processo, todos na cor forte (o selecionado ganha anel na própria cor e a etiqueta "Selecionado"). Cada um mostra os protocolos em andamento e os atrasados. A escolha fica na URL (`processo`) e as filas abaixo contam só o processo escolhido.

| Processo | Cor | Tipos |
| --- | --- | --- |
| Todos os processos | Grafite | Todos |
| Ingresso | Azul | Transferência externa, portador de diploma e retorno ao curso |
| Transferência interna | Verde-azulado | Transferência interna |
| Aproveitamento de estudos | Magenta | Aproveitamento de estudos |

Aproveitamento de estudos é de quem já é aluno e termina na análise concluída (etapa `CONCLUIDO`): sem proposta, sem matrícula, sem a aba Proposta e sem a fila "Liberadas matrícula". O filtro "Tipo de solicitação" só aparece em processo com mais de um tipo. A busca de aluno atravessa todos os processos.

## Oito filas

| Fila | Cor | Etapas |
| --- | --- | --- |
| Novas análises | Azul | Rascunho e pré-análise |
| Aguardando documentos | Vermelho | Aguardando documentos |
| Em análise | Laranja | Em análise |
| Em análise coordenador | Âmbar | Aguardando coordenação |
| Entregue pelo coordenador | Lima | Ajuste pós-coordenação |
| Liberadas matrícula | Verde petróleo | Pronto para matrícula, proposta enviada e negociação |
| Concluídas | Azul acinzentado | Matriculado, concluído (aproveitamento), perdido e cancelado |
| Todas | Violeta | Todos, incluindo adiados e encerrados |

Grupos organizam navegação sem alterar transições. Contagens respeitam o ciclo e excluem registros internos de teste. Status individual distingue os desfechos agrupados em Concluídas.

## Busca e filtros

- RA, nome, CPF ou protocolo: atravessa etapas e inclui encerrados, sem agrupar pessoas.
- Curso digitável por parte do nome, sem exigir acentos. Sugestões vêm do catálogo.
- Oferta: Todos, Presencial diurno, Presencial noturno, Híbrido e EAD. Diurno reúne turnos presenciais diferentes de noturno. Híbrido corresponde a SEMIPRESENCIAL.
- Curso, oferta, tipo, atraso e ciclo compõem a busca. A coordenação recebe orientação junto aos campos.
- Limpar pesquisa remove busca e filtros operacionais, mantendo a fila. Ver todas remove também fila e ciclo.
- Ctrl+K oferece resultados com protocolo e atalho à lista completa.
- Exportar planilha percorre todas as páginas e usa CSV compatível com Excel, sem dados sensíveis.

## Página do protocolo

Identidade e matrícula do aluno, protocolo, curso, oferta, tipo e inclusão. Depois: etapa, responsável, jornada, próximo passo e abas Análise, Documentos, Dados e Proposta. Não há aba principal dedicada a conversa ou histórico.

Identificação em faixa azul, corpo azul suave e etapa com a cor da fila. Abas coloridas distinguem cada área; a selecionada tem cor forte. Ações principais têm preenchimento colorido conforme o propósito: verde para confirmar/avançar, âmbar para coordenação, roxo para notas/PDF e azul para dados. Ações bloqueadas ficam neutras e mantêm seus motivos visíveis. Os dois temas conservam contraste de texto e estados de foco.

Aba inicial segue o processo: Documentos antes da análise, Proposta nas etapas de matrícula e Análise nas demais. Análises deste aluno retorna à lista com busca por RA ou nome e remove filtros que poderiam esconder protocolos.

Ao abrir o protocolo, a lateral direita apresenta o painel da equipe, com observações em destaque roxo, autor, data/hora e adição com @menção. Ele permanece disponível em Análise, Documentos, Dados e Proposta; trocar a aba principal preserva o rascunho. No celular, vem logo após a identificação e antes das ações e da grade. Miniabas Observações (padrão), Mensagens e Histórico reúnem contatos e movimentações no mesmo painel. As três notas mais recentes aparecem completas; anteriores abrem sob demanda. Histórico permite todos os registros, sistema ou decisões. Mensagem ao candidato abre o compositor aprovado em gaveta e mantém a confirmação de envio.

Seleção das miniabas e filtros usa `hist` na URL; links antigos com `aba=conversa` abrem a aba operacional padrão da etapa e o painel da equipe. Os atalhos das abas principais passam a ser 1–4. Exportar PDF permanece na barra da análise e imprime somente o relatório curricular, sem notas internas ou registros da equipe.

MAT é o vínculo do aluno, independente da etapa. Check verde significa matriculado; X vermelho, não matriculado. Ícones têm texto acessível. Inclusão é a criação do protocolo; liberação é a última entrada em PRONTO_PARA_MATRICULA, ou ausência explícita.

## Reabrir análise (15/10/2026)

Depois da proposta (ou do aproveitamento concluído), "Reabrir análise" abre na aba Análise: escolher o destino (equipe de análises ou coordenação do curso), o motivo, o que o aluno contestou e as disciplinas contestadas (obrigatórias para a coordenação). As disciplinas ganham a marca "Contestada" e o filtro "Contestadas"; na coordenação, cada uma vira pergunta. O resumo deixa de valer e a proposta sai de novo depois da nova conclusão.

## Coordenadores (15/10/2026)

O acesso Coordenadores entra por "Pareceres": passo a passo, protocolos aguardando o parecer dele e os devolvidos. No protocolo, cada disciplina tem três passos (ler a pergunta, comparar com o histórico, dar o parecer em linguagem simples: aproveita, aproveita com adaptação, cursa como dependência, não aproveita). Fundamento técnico obrigatório quando diverge da sugestão; o parecer vai para as observações do protocolo. Ao terminar, "Devolver para a analista" no Próximo passo.

## Conferência lado a lado (15/10/2026)

"Conferir lado a lado" (barra da análise ou "Ver no histórico escolar" no parecer) abre dois painéis grandes: à esquerda, o histórico escolar anexado (uma aba por instituição); à direita, a matriz atual por período com código, disciplina, CH, nota e decisão. Selecionar uma disciplina grifa as origens no histórico com animação: âmbar quando a IA está em dúvida (com a nota da IA ao lado), azul quando é correspondência. "Dúvidas da IA" filtra; "Próxima dúvida" ou `]` e `[` caminham por elas; 1 a 4 decidem; passar o mouse numa linha do histórico permite usá-la na disciplina. URL: `conferir=1` e `item`.

## Responsividade e estados

Desktop: oito filas e tabela virtualizada. A única rolagem vertical é a da página de trabalho: título, filas e filtros saem da área visível enquanto as linhas passam a ocupar a tela. A tabela não tem altura fixa nem rolagem vertical independente. Telas estreitas: filas deslizam e filtros empilham. Tabela mantém colunas com rolagem horizontal e instrução.

AsyncState para carregamento, erro e vazio. Paginação inclui botão e recuperação de falhas. Preservar foco, teclado, contraste e redução de movimento. Sem seletor de papel e sem textos de demonstração na interface.
