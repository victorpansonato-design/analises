# Análises · UniAnchieta

<!-- impeccable:product-schema 1 -->

## Platform

web · exclusivamente desktop (PC)

## Users

Colaboradores de vendas, análises acadêmicas, coordenação e suporte. Todos têm o mesmo acesso e escolhem a etapa em que precisam trabalhar.

## Product Purpose

Conduzir análises curriculares até a matrícula com clareza e pouco esforço. Vendas deve gastar menos tempo no sistema para dedicar mais tempo à venda. Coordenação e suporte devem entender rapidamente cada protocolo.

## Capabilities and Constraints

- Cálculo de Dispensa é um módulo independente para atendimento: consulta por RA, simulação manual e conferência das mensalidades por período, sem consumir os dados de Análises. Regras Normal, CEU e ProUni 50% em `docs/calculo-dispensa.md`. A integração com o Lyceum é futura; a base atual é inventada e simulada por MSW.
- Uso somente em computadores. Desenvolvimento e validação focados em desktop; sem trabalho ou testes específicos para mobile ou tablet, salvo solicitação explícita do usuário.
- Transferência externa, portador de diploma, transferência interna e retorno ao curso.
- Uma linha por protocolo, inclusive quando vários protocolos pertencem ao mesmo aluno.
- Perfil abre uma página inteira para a análise. Voltar mantém busca e filtros.
- Busca por RA ou nome em todas as etapas. Curso e oferta em destaque para a coordenação.
- MAT representa a matrícula do aluno, independentemente da etapa do protocolo.
- Preservar documentos, histórico, decisões curriculares, propostas e rastreabilidade.
- Front-end com MSW; integrações reais ficam para o TI. Não fazer commits sem solicitação.
- Dados inventados no código. CPF mascarado por padrão e revelação registrada.

## Brand Commitments

Identidade Anchieta e cores das oito filas do sistema anterior, com apresentação atualizada. Português do Brasil. Remover textos de demonstração da interface e manter a base inventada.

## Evidence on Hand

Requisitos e capturas fornecidos pelo usuário. Regras e pendências em docs/. As capturas têm dados pessoais e servem apenas como referência visual.

## Product Principles

- Mostrar o próximo passo antes de exigir exploração.
- Reduzir preenchimento, repetição e trocas de contexto.
- Preservar o vocabulário que a equipe conhece.
- Cada protocolo mantém sua identidade, decisões e histórico.
- IA sugere; pessoas decidem.
