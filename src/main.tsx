import { env } from "@/config/env";
import { QueryProvider } from "@/providers/query-provider";
import AppRoute from "@/routes/app.routes";
import "@/stores/theme.store";
import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

/** Com `VITE_USE_MOCKS=true` o front roda inteiro com dados simulados (MSW) antes do primeiro render. */
async function prepararDados(): Promise<void> {
   if (!env.useMocks) return;
   const { iniciarMocks } = await import("@/mocks/browser");
   await iniciarMocks();
}

void prepararDados().then(() => {
   createRoot(document.getElementById("root")!).render(
      <StrictMode>
         <MotionConfig reducedMotion="user">
            <QueryProvider>
               <AppRoute />
            </QueryProvider>
         </MotionConfig>
      </StrictMode>,
   );
});
