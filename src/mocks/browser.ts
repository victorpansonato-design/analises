/**
 * Dados simulados (MSW) no navegador. Só é importado com `VITE_USE_MOCKS=true`, por `import()`
 * dinâmico no `main.tsx`: sem a flag, nada daqui entra no bundle de produção.
 */
import { setupWorker } from "msw/browser";

import { env } from "@/config/env";

import { iniciarDb } from "@/mocks/db/iniciar";
import { handlers } from "@/mocks/handlers";

export async function iniciarMocks(): Promise<void> {
   iniciarDb();
   const worker = setupWorker(...handlers);
   await worker.start({
      serviceWorker: { url: `${env.baseUrl}mockServiceWorker.js`, options: { scope: env.baseUrl } },
      onUnhandledRequest: "bypass",
      quiet: true,
   });
}
