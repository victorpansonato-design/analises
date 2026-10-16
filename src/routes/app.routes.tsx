import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import { env } from "@/config/env";
import { AuthProvider } from "@/contexts/auth/auth-context";
import MainLayout from "@/layout/main-layout";
import AnalisesPage from "@/pages/protected/analises";
import CalculoDispensaPage from "@/pages/protected/calculo-dispensa";
import GestaoPage from "@/pages/protected/gestao";
import PareceresPage from "@/pages/protected/pareceres";
import AcompanhamentoPage from "@/pages/publico/acompanhamento";
import { useMe } from "@/features/sessao";
import MatrizCurricularPage from "@/pages/protected/matriz-curricular";
import PrivateRoute from "@/routes/private-route";

/** Vitrine dos primitivos: só existe em desenvolvimento (não entra no build de produção). */
const DevUiPage = import.meta.env.DEV ? lazy(() => import("@/pages/dev/dev-ui")) : null;

/** Entrada: coordenadores caem nos pareceres; o resto, nas análises (links com caso seguem para lá). */
function EntradaAnalises() {
   const { search, hash } = useLocation();
   const me = useMe();
   if (me.isLoading) return null;
   const coordenador = me.data?.acesso === "COORDENACAO" && !new URLSearchParams(search).has("caso");
   return <Navigate to={{ pathname: coordenador ? "/pareceres" : "/analises", search, hash }} replace />;
}

/** Rotas da equipe: a sessão (`/me`) só é consultada aqui, nunca na página pública do aluno. */
function ComSessao() {
   return (
      <AuthProvider>
         <Outlet />
      </AuthProvider>
   );
}

export default function AppRoute() {
   return (
      <BrowserRouter basename={env.baseUrl}>
         {/* Toaster do DS (§10.19): canto inferior direito; o cartão é desenhado por `lib/notify`. */}
         <Toaster position="bottom-right" offset={24} />
         <Routes>
            {/* Pública: o aluno acompanha o pedido sem login (nem consulta de sessão, nem SSO). */}
            <Route path="/acompanhe/:token" element={<AcompanhamentoPage />} />

            <Route element={<ComSessao />}>
               {/* Sem sessão válida, o interceptor redireciona ao SSO automaticamente */}
               <Route path="/" element={<EntradaAnalises />} />

               <Route element={<PrivateRoute />}>
                  <Route element={<MainLayout />}>
                     {/* Tela única: caso, aba, visão e filtros vivem na URL (docs/14 ADR-006). */}
                     <Route path="/analises" element={<AnalisesPage />} />
                     <Route path="/calculo-dispensa" element={<CalculoDispensaPage />} />
                     <Route path="/gestao" element={<GestaoPage />} />
                     <Route path="/pareceres" element={<PareceresPage />} />
                     <Route path="/matriz-curricular" element={<MatrizCurricularPage />} />
                     {DevUiPage ? (
                        <Route
                           path="/dev/ui"
                           element={
                              <Suspense fallback={null}>
                                 <DevUiPage />
                              </Suspense>
                           }
                        />
                     ) : null}
                  </Route>
               </Route>

               <Route path="*" element={<Navigate to="/analises" replace />} />
            </Route>
         </Routes>
      </BrowserRouter>
   );
}
