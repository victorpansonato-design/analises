# 08 · Comunicação com o candidato (Blip / WhatsApp)

> O front **nunca** chama o Blip diretamente. Ele pede ao backend: "envie o template X para o caso Y"
> (`POST /casos/{id}/mensagens`). O backend fala com o Blip, guarda a mensagem e recebe as respostas
> por webhook, que viram eventos `mensagem.recebida` na linha do tempo.

## 1. Pontos técnicos do Blip (para o TI) — fonte: documentação oficial

Fonte: [Enviar notificações WhatsApp via API do Blip](https://hmg-help.blip.ai/docs/en/channels/whatsapp/enviar-notificacao-whatsapp-blip-api)

- Mensagem enviada pelo bot **mais de 24 h depois da última mensagem do cliente** é notificação e
  precisa usar **template aprovado** pelo WhatsApp (namespace + nome do template).
- Autenticação por chave do bot (`Authorization: Key …`); comandos em `https://http.msging.net/commands`
  e mensagens em `https://http.msging.net/messages`.
- É preciso resolver a identidade do cliente no WhatsApp (`alternativeAccount`) uma vez por número e
  guardar.
- Templates aceitam variáveis no corpo, cabeçalho com documento (útil para o PDF da proposta) e
  botões de resposta rápida.
- Envio ativo pelo Blip Desk também existe ([Habilitar envio de mensagem ativa pelo Desk](https://help.blip.ai/hc/en-us/articles/27991280412311-Enable-Active-Message-Sending-via-Desk)),
  útil para a equipe de matrícula continuar a conversa humana no Desk.
- Disponibilidade por plano e saldo de disparos devem ser confirmados com o Blip **[VALIDAR com TI]**.

**Decisão em aberto para o TI:** a coleta de documentos será (a) no próprio WhatsApp (o candidato
manda foto/PDF para o bot, que grava no GED) ou (b) por link seguro de upload. Recomendação de CX:
**(a) como canal principal e (b) como alternativa**, porque o candidato já está no WhatsApp e foto
pelo celular é o menor esforço. O front funciona igual nos dois casos (documento chega com
`canal: WHATSAPP | LINK | INTERNO | CONSULTOR`).

## 2. Régua de mensagens (automática, parametrizada)

| Gatilho | Quando | Template | Para quem é a ação humana se não houver resposta |
|---|---|---|---|
| `ENVIAR_PROTOCOLO` (com documentos) | imediato | `protocolo_aberto` | — |
| Documento pendente | D+1, D+3, D+5 às 9h **[parâmetro]** | `lembrete_documentos` | D+7: consultor recebe tarefa "falar com candidato" |
| `documento.recusado` | imediato | `documento_recusado` | — |
| `documentos.completos` | imediato | `documentos_completos` | — |
| `ENVIAR_PROPOSTA` | ação da matrícula | `proposta_pronta` | — |
| Proposta sem resposta | D+1, D+3 | `lembrete_proposta` | D+7: `MARCAR_SEM_RETORNO` |
| `EFETIVAR_MATRICULA` | imediato | `matricula_confirmada` | — |
| D+1 após matrícula | 10h | `pesquisa_esforco` (CES + CSAT) | — |
| `ENCERRAR_PERDIDO` / sem retorno | opcional / imediato | `encerramento_porta_aberta` | — |

Regras: no máximo **uma mensagem automática por dia** por candidato; nenhuma mensagem automática entre
20h e 8h nem aos domingos **[parâmetro]**; a régua para assim que o candidato responde (conversa
passa a ser humana).

## 3. Templates prontos (texto para aprovação no WhatsApp)

> Tom acolhedor, claro, sem juridiquês, **uma ação por mensagem**, sempre com o próximo passo e o
> canal de ajuda. Variáveis no padrão `{{n}}`. Revisar com Marketing antes de submeter.

**`protocolo_aberto`**
> Oi, {{1}}! Aqui é da UniAnchieta. Recebemos seu pedido de {{2}} para {{3}}.
> Para analisarmos o que você pode aproveitar, envie aqui mesmo uma foto ou PDF de:
> {{4}}
> Leva poucos minutos. Se tiver dúvida, é só responder esta mensagem.

`{{2}}` = "transferência", "aproveitamento do seu diploma", "troca de curso" ou "retorno ao curso".
`{{4}}` = lista curta do checklist (ex.: "• Histórico escolar da sua faculdade • Planos de ensino das disciplinas cursadas").

**`lembrete_documentos`**
> {{1}}, sua análise está quase começando. Só falta: {{2}}.
> Pode mandar por aqui mesmo, foto do celular serve.
> [Enviar agora] [Preciso de ajuda]

**`documento_recusado`**
> {{1}}, recebemos o arquivo {{2}}, mas {{3}}. Pode enviar de novo?
> Dica: {{4}}

`{{3}}` ex.: "a imagem ficou desfocada" · `{{4}}` ex.: "fotografe com boa luz e o documento inteiro na tela".

**`documentos_completos`**
> Tudo certo, {{1}}! Recebemos todos os seus documentos. Agora nossa equipe vai analisar seu histórico.
> Você recebe o resultado por aqui em até {{2}}.

**`proposta_pronta`** (cabeçalho com PDF do resumo, quando disponível)
> {{1}}, sua análise ficou pronta! 🎓
> Você aproveita {{2}} disciplinas ({{3}} horas) e a previsão é concluir {{4}} em {{5}} semestres.
> Quer que eu te explique os próximos passos e os valores?
> [Quero saber] [Falar depois]

*(O emoji é opcional e só na mensagem ao candidato; nunca na interface do sistema.)*
`{{5}}` vem do resumo congelado e é acompanhado no PDF da frase "previsão sujeita à oferta de disciplinas".

**`lembrete_proposta`**
> Oi, {{1}}! Sua análise para {{2}} continua disponível. Posso tirar alguma dúvida?
> [Quero conversar] [Não tenho interesse]

**`matricula_confirmada`**
> Bem-vindo(a) à UniAnchieta, {{1}}! Sua matrícula em {{2}} está confirmada.
> Seu RA é {{3}}. Nos próximos dias você recebe as orientações de início das aulas.

**`pesquisa_esforco`**
> {{1}}, uma pergunta rápida: de 1 a 5, quão fácil foi enviar seus documentos e entender sua análise?
> (1 = muito difícil · 5 = muito fácil)

**`encerramento_porta_aberta`**
> {{1}}, vamos encerrar seu pedido por enquanto. Se quiser retomar, é só responder esta mensagem:
> sua análise fica guardada para o próximo período.

*(Confirmar com Secretaria por quanto tempo a análise pode ser reaproveitada antes de oferecer isso.)*

## 4. No front

- Aba **Conversa e histórico**: mensagens enviadas e recebidas na linha do tempo, com status
  (enviada, entregue, lida, falhou) quando o backend souber.
- **Mensagem ao candidato**: só templates aprovados, com variáveis preenchidas automaticamente a
  partir do caso e **prévia exatamente como o candidato verá**. Campos variáveis vazios bloqueiam o
  envio com explicação.
- Botão "Abrir conversa no Blip Desk" (link externo) para a matrícula continuar a conversa humana.
- Falha de envio vira Callout no caso e item na "Minha vez" do responsável.
