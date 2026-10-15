# 07 · IA de pré-análise

> A IA **já existe** como endpoint interno (botão "Validar com IA" do sistema atual). O front novo não
> conhece o formato desse endpoint: conversa com o **nosso contrato** (`contracts/openapi.yaml`,
> recursos `/casos/{id}/pre-analise`). Um adaptador no backend (ou, durante a transição, em
> `src/features/analise/api/pre-analise.adapter.ts`) traduz.
>
> **Antes de implementar o adaptador real:** pedir ao TI um exemplo de requisição e resposta do
> endpoint atual (anonimizado). Até lá, o MSW simula o nosso contrato.

## 1. Quando roda

| Gatilho | Automático? |
|---|---|
| Documentos completos (`documentos.completos`) | Sim |
| Histórico interno migrado (interna/retorno) | Sim |
| `ALTERAR_DESTINO` (troca de curso/matriz) | Sim |
| Documento novo aceito depois da pré-análise | Sim, com aviso "Há sugestões novas" (não sobrescreve decisões confirmadas) |
| Analista clica "Reexecutar pré-análise" | Manual |

Enquanto roda, a etapa é `PRE_ANALISE` e a aba Análise mostra skeleton com "Lendo histórico… cerca
de 1 min" **[parâmetro]**. Falhou ou passou de `sla.preAnalise` → `FALHAR_PRE_ANALISE` e o caso vai
para a analista com a grade sem sugestões (nunca trava o fluxo).

## 2. Contrato (resumo do que o front recebe)

```jsonc
// GET /casos/{id}/pre-analise
{
  "status": "CONCLUIDA",              // PENDENTE | PROCESSANDO | CONCLUIDA | FALHOU
  "iniciadaEm": "2026-10-09T17:00:12Z",
  "concluidaEm": "2026-10-09T17:01:03Z",
  "modelo": "interno-v3",              // identificação do serviço, para auditoria
  "origem": {                          // o que a IA extraiu do histórico
    "ies": "Faculdade Exemplo",
    "curso": "Gestão Empresarial",
    "disciplinas": [
      { "id": "o1", "nome": "Teoria geral da administração", "ch": 60, "nota": 8.5,
        "ano": 2024, "semestre": 1, "situacao": "APROVADO", "confiancaExtracao": 0.97 }
    ]
  },
  "sugestoes": [
    { "itemMatrizId": "m-adm-101", "decisao": "DISPENSA", "origemIds": ["o1"],
      "confianca": "ALTA", "fonte": "REGRA",          // REGRA (base de equivalências) | IA
      "justificativa": "Equivalência registrada pela coordenação em 12/03/2026.",
      "alertas": [] }
  ],
  "avisos": ["Página 3 do histórico com baixa legibilidade."]
}
```

Escala de confiança mostrada na UI: `ALTA` (≥ `ia.limiarAlta`), `MEDIA`, `BAIXA` e `REGRA` quando a
fonte é a base de equivalências (decisão humana anterior). Se o endpoint devolve número (0–1), o
adaptador converte pelos limiares de `15-parametros.md`.

## 3. Humano no comando (regras de produto)

1. Nenhuma sugestão vira decisão sem confirmação humana (aceite individual ou em lote).
2. O aceite em lote só pega `ALTA` e `REGRA`.
3. A interface nunca chama sugestão de "decisão". Rótulo: "Sugestão" + fonte.
4. Toda decisão guarda `origem` (IA, REGRA, ANALISTA, COORDENACAO) para auditoria e para medir a IA.
5. Extração com `confiancaExtracao` baixa destaca o valor (nota/CH) para conferência no documento.
6. Nada da pré-análise é enviado ao candidato. Só o resumo **congelado** em `CONCLUIR_ANALISE`.

## 4. Medir a IA (indicadores próprios)

- **Taxa de aceite sem alteração** = itens com decisão final igual à sugestão ÷ itens sugeridos.
- **Taxa de alteração por motivo** (CH insuficiente, conteúdo divergente…).
- **Cobertura** = itens com sugestão ÷ itens da matriz.
- **Tempo de pré-análise** (mediana e p90).
- **Falhas** ÷ execuções.
Essas métricas aparecem no painel de indicadores (`10`) para DIRETORIA/ADMIN e alimentam a melhoria
do serviço de IA com o TI.

## 5. Base de equivalências (o aprendizado que reduz a coordenação)

- Uma **equivalência** é `{ iesOrigem, cursoOrigem?, disciplinaOrigem (nome normalizado + CH mínima),
  disciplinaDestino (id na matriz), decisao, criadaPor, criadaEm, validaAte?, observacao }`.
- Nasce quando a coordenação responde com "Usar como regra" ou quando um ADMIN cadastra.
- Para matrizes internas (interna/retorno), as equivalências entre matrizes são cadastradas uma vez
  por mudança curricular.
- Na pré-análise, uma equivalência válida **ganha da IA** e aparece como `REGRA`.
- Equivalência pode ser revogada (com motivo); casos em andamento que a usaram mostram aviso.
- Meta de produto: a cada ciclo, menos perguntas à coordenação por caso (ver `10`).

## 6. Privacidade

O histórico e os documentos contêm dados pessoais. O serviço de IA é interno; se em algum momento
for usado serviço externo, isso exige avaliação do encarregado de dados (DPO) e contrato de
tratamento antes da integração. Ver `11`.
