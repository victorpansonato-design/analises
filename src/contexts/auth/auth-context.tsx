import { env } from "@/config/env";
import { handleApiError } from "@/services/api";
import { authService } from "@/services/auth.service";
import type { AuthContextData } from "@/types/auth.types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { createContext, useCallback, useMemo, type ReactNode } from "react";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextData | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
   const queryClient = useQueryClient();

   const { data: user, isLoading } = useQuery({
      queryKey: ["authUser"],
      queryFn: () => authService.me(),
      staleTime: Infinity,
      gcTime: Infinity,
   });

   const logout = useCallback(async () => {
      try {
         await authService.logout();
         queryClient.clear();
         window.location.replace(env.baseUrl);
      } catch (error) {
         handleApiError({
            error,
            title: "Erro ao sair",
            defaultMessage: "Nao foi possivel encerrar sua sessao. Tente novamente.",
         });
      }
   }, [queryClient]);

   const value = useMemo<AuthContextData>(
      () => ({
         user: user ?? null,
         isLoading: isLoading,
         isAuthenticated: !!user,
         logout,
      }),
      [user, isLoading, logout],
   );

   if (isLoading) {
      return (
         <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
      );
   }

   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
