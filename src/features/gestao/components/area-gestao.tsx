/**
 * Área da gestão comercial (`/gestao`): indicadores do funil e rendimento da equipe de vendas.
 * Única área restrita do sistema: só quem tem `VER_GESTAO` (papel GESTAO) entra; o menu nem mostra
 * o item para os outros e a API responde 403. A aba vive na URL (`aba`).
 */
import { motion } from "motion/react";
import { LockKeyhole } from "lucide-react";

import { EmptyPanel } from "@/components/core/empty-panel";
import { UnderlineTabs } from "@/components/core/underline-tabs";
import { AsyncState } from "@/components/ui/async-state";
import { Skeleton } from "@/components/ui/skeleton";
import { temCapacidade } from "@/features/casos";
import { PainelIndicadores } from "@/features/indicadores";
import { useMe } from "@/features/sessao";
import { pageVariants } from "@/lib/motion";

import { PainelEquipe } from "@/features/gestao/components/painel-equipe";
import { useGestaoUrl } from "@/features/gestao/hooks/use-gestao-url";
import type { AbaGestao } from "@/features/gestao/types/gestao.schema";

const ABAS = [
   { value: "indicadores", label: "Indicadores" },
   { value: "equipe", label: "Equipe e metas" },
] as const satisfies readonly { value: AbaGestao; label: string }[];

export function AreaGestao() {
   const me = useMe();
   const { aba, definir } = useGestaoUrl();
   const pode = temCapacidade(me.data?.papeis ?? [], "VER_GESTAO");

   return (
      <div className="mx-auto w-full max-w-[1280px] space-y-5 px-1 pt-1 pb-8">
         <header>
            <h1 className="text-[25px] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[28px]">Gestão comercial</h1>
            <p className="mt-1 text-[13px] text-ink-3">O funil, a conversão e o rendimento da equipe de vendas contra a meta.</p>
         </header>
         <AsyncState
            isLoading={me.isLoading}
            isError={me.isError}
            loading={<Skeleton className="h-10 w-72" />}
            error={
               <EmptyPanel
                  tone="crit"
                  icon={LockKeyhole}
                  title="Não foi possível conferir o seu acesso"
                  message="Recarregue a página; se continuar, avise o suporte."
               />
            }
         >
            {pode ? (
               <>
                  <UnderlineTabs
                     tabs={ABAS}
                     value={aba}
                     onChange={v => definir("aba", v === "indicadores" ? null : v, false)}
                     layoutId="gestao-abas"
                     ariaLabel="Área de gestão"
                     idBase="gestao"
                  />
                  <motion.div
                     key={aba}
                     role="tabpanel"
                     id={`gestao-panel-${aba}`}
                     aria-labelledby={`gestao-tab-${aba}`}
                     variants={pageVariants}
                     initial="initial"
                     animate="animate"
                  >
                     {aba === "indicadores" ? <PainelIndicadores /> : <PainelEquipe />}
                  </motion.div>
               </>
            ) : (
               <EmptyPanel
                  icon={LockKeyhole}
                  title="Área da gestão comercial"
                  message="Os indicadores e as metas da equipe ficam disponíveis só para a gestão comercial. Se você precisa de acesso, fale com a gestora da área."
               />
            )}
         </AsyncState>
      </div>
   );
}
