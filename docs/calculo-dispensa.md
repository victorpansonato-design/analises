# Cálculo de Dispensa

Módulo de atendimento independente de Análises. A rota interna `/calculo-dispensa` usa o mesmo shell, a sessão e o design system. O módulo não consulta protocolos, matrizes ou resultados do sistema de Análises. A busca global, os ciclos de captação e as notificações de Análises não aparecem nesta rota.

## Experiência

- Consulta por RA carrega os vínculos acadêmicos e permite selecionar o período letivo.
- A grade, o contrato mensal integral, as dispensas do histórico e as condições financeiras vêm do vínculo selecionado. Disciplinas dispensadas entram desmarcadas.
- A coluna Histórico continua mostrando a informação original ao simular outras seleções.
- A memória de cálculo atualiza a cada alteração. O resultado não é válido enquanto houver campos numéricos inválidos.
- Ajustar parâmetros abre os seletores de ano, período, curso, currículo, turno e série. Trocar a grade carrega seu contrato e reinicia seleções/descontos a partir do vínculo correspondente; sem vínculo, inicia uma simulação manual.
- Restaurar cadastro recupera os dados originais do aluno no período. As simulações não gravam alterações acadêmicas ou financeiras.
- Cálculo manual funciona sem RA. Para o financeiro é necessário um vínculo do aluno para a oferta selecionada.
- Ver financeiro abre um painel com somente as mensalidades do vínculo/período selecionado. Compara previsto, lançado e diferença; permite filtrar divergências. Totais a maior e a menor não se compensam.
- Diferença indica necessidade de conferência, não um erro confirmado. O painel compara com a simulação corrente e identifica quando houve ajustes.

## Regras confirmadas pelo usuário em 14/10/2026

Todos os valores monetários são representados em centavos. Seja `C` o contrato mensal integral, `D` o valor mensal das disciplinas excluídas e `b` a bolsa comercial em percentual:

| Perfil | Mensalidade antes de descontos adicionais |
| --- | --- |
| Normal | `(C − D) × (1 − b/100)` |
| CEU | `((C − D) × (1 − b/100)) × 1,10 ÷ 2` |
| ProUni 50% | `C × (1 − b/100) ÷ 2` |

No CEU, o acréscimo de 10% incide no saldo após dispensa e bolsa comercial. Exemplo confirmado: saldo de R$ 600 → R$ 660 → R$ 330. No ProUni 50%, as dispensas não reduzem a base do cálculo, conforme a fórmula informada.

O valor das disciplinas é distribuído proporcionalmente aos créditos da grade. O resíduo de centavos fica na última disciplina, para preservar o total do contrato. O arredondamento ocorre em cada etapa monetária. O TI deve validar o método de rateio e arredondamento com o contrato real do Lyceum.

Os campos anteriores de desconto fixo e antecipações foram preservados como opções adicionais: o fixo é aplicado depois da regra do perfil, limitado ao valor disponível; antecipado 1/2 aplica um desconto percentual sobre o resultado. Essa posição dos descontos adicionais é uma convenção do esboço, a validar antes da integração real. A conferência usa a condição de pagamento de cada mensalidade (`regular`, `antecipado1` ou `antecipado2`). Taxas, acordos, juros e multas ficam fora da comparação.

## Dados e futura integração Lyceum

O front utiliza React Query e endpoints próprios, simulados por MSW quando `VITE_USE_MOCKS=true`. Os dados não são extraídos de Análises. Não há integração real com o Lyceum nesta entrega.

| Endpoint | Retorno no envelope `{ success: true, data }` |
| --- | --- |
| `GET /calculo-dispensa/catalogo` | `GradeDispensa[]`: oferta, contrato mensal e disciplinas/créditos |
| `GET /calculo-dispensa/alunos/:ra` | `AlunoDispensa`: identificação e vínculos; `null` para RA não encontrado |

Tipos em `src/features/calculo-dispensa/types.ts`. Cada vínculo relaciona um `gradeId`, dispensas por ID, descontos/perfil e mensalidades. Cada mensalidade possui competência, vencimento, valor lançado em centavos, situação de pagamento e condição de desconto. O adapter do backend deve entregar exclusivamente mensalidades do período/vínculo, considerar a vigência das dispensas e das bolsas e respeitar o acesso de cada setor. O front atualmente compara um cenário uniforme do período, sem modelar mudanças retroativas por mês.

Base inventada: RA `2026001` (Clara, dois períodos; outubro com R$ 750 lançados contra R$ 600 previstos) e `2026002` (Rafael, valores coincidentes). Catálogo com Administração, Ciências Contábeis e Direito, contratos de 2025/2026, períodos 1/2, turnos e séries.

## Validação

Testes unitários de fórmulas, arredondamento, descontos adicionais e diferenças financeiras; testes de integração com MSW para RA, dispensas, restauração, troca de período, perfis e fallback manual. Validação visual apenas desktop, em 1440×1000 e 1280×900, com sidebar aberta e temas claro/escuro. O design system existente foi preservado.
