/** Registro de todos os handlers simulados. A ordem importa: rotas específicas antes de `/casos/:casoId`. */
import { handlersAcompanhamento } from "@/mocks/handlers/acompanhamento";
import { handlersAnalise } from "@/mocks/handlers/analise";
import { handlersCasos } from "@/mocks/handlers/casos";
import { handlersCatalogos } from "@/mocks/handlers/catalogos";
import { handlersComunicacao } from "@/mocks/handlers/comunicacao";
import { handlersDocumentos } from "@/mocks/handlers/documentos";
import { handlersDispensa } from "@/mocks/handlers/dispensa";
import { handlersGestao } from "@/mocks/handlers/gestao";
import { handlersIndicadores } from "@/mocks/handlers/indicadores";
import { handlersMatrizCurricular } from "@/mocks/handlers/matriz-curricular";
import { handlersNotificacoes } from "@/mocks/handlers/notificacoes";
import { handlersProposta } from "@/mocks/handlers/proposta";
import { handlersProtocolo } from "@/mocks/handlers/protocolo";
import { handlersSessao } from "@/mocks/handlers/sessao";
import { handlersTimeline } from "@/mocks/handlers/timeline";

export const handlers = [
   ...handlersAcompanhamento,
   ...handlersDispensa,
   ...handlersMatrizCurricular,
   ...handlersSessao,
   ...handlersCatalogos,
   ...handlersProtocolo,
   ...handlersAnalise,
   ...handlersDocumentos,
   ...handlersTimeline,
   ...handlersComunicacao,
   ...handlersProposta,
   ...handlersIndicadores,
   ...handlersGestao,
   ...handlersNotificacoes,
   ...handlersCasos,
];
