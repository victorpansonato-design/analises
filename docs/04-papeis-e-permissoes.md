# 04 · Acesso comum e responsabilidade

Atualizado em 13/10/2026: todos os colaboradores têm o mesmo acesso. Vendas, análises, coordenação, matrícula, suporte e diretoria usam as mesmas filas e página de protocolo. Não há seletor de papel.

## Ações

Papéis identificam equipes para distribuição, autoria e notificações. Não restringem ações humanas. A máquina valida etapa, guardas, motivo obrigatório e aceite. Ações automáticas de pré-análise e sem retorno continuam exclusivas do sistema.

DECIDIR_ITEM só em análise, ajuste e coordenação. PERGUNTAR_COORDENACAO só em análise e ajuste. RESPONDER_ITEM_COORDENACAO só na coordenação. Encerrados bloqueiam mudanças incompatíveis. Acesso comum não elimina validação da versão nem permite sobrescrever alterações concorrentes.

## Dados

CPF mascarado por padrão para todos. Revelação e visualização de documentos geram log. Exportações não incluem CPF, contato nem documentos. Matrícula do aluno é um dado próprio, independente da etapa de cada protocolo.

## Contrato

O front consome a lista final acoesDisponiveis com motivos de bloqueio. Backend real deve aplicar esta política comum. Implementação em domain/permissoes.ts e domain/caso.machine.ts, exercitada por MSW e testes.

## Três acessos (14/10/2026)

Há só três acessos: **Todos** (todo mundo, o sistema inteiro menos a área de gestão), **Gestão comercial** (Hellen Bueno, com indicadores e metas) e **Coordenadores** ([VALIDAR] por enquanto igual a Todos). Papel continua dizendo a responsabilidade (distribuição, autoria, notificações); acesso diz o que a pessoa vê. Com dados simulados, o rodapé lateral troca o acesso; o tema fica só no canto superior direito.

## Exceção: gestão comercial (14/10/2026)

A área `/gestao` (indicadores, rendimento e metas da equipe de vendas) é a única restrita. Só o papel `GESTAO` (Gestão comercial) tem `VER_GESTAO` e `VER_INDICADORES_POR_PESSOA`; hoje é a gestora Hellen Bueno. Os outros papéis não veem o item no menu, não acham o comando na busca e recebem 403 em `GET /indicadores` e `/gestao/*`. O backend real atribui `GESTAO` pelo cadastro de usuários, nunca por nome no código.
