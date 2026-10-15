import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Outlet } from "react-router-dom";

export default function PrivateRoute() {
   const { isLoading, isAuthenticated } = useAuth();

   // !isAuthenticated => o interceptor (401) já disparou o redirect ao SSO;
   // aqui só mantemos o loader enquanto o browser navega.
   if (isLoading || !isAuthenticated) {
      return (
         <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
         </div>
      );
   }

   return <Outlet />;
}
