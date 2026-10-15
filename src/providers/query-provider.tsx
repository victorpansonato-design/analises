import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
   const queryClient = new QueryClient({
      defaultOptions: {
         queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 10,
            retry: (failureCount, error) => {
               if (error && typeof error === "object" && "status" in error) {
                  const status = error.status as number;
                  const httpCodesToNotRetry = [400, 401, 403, 404, 422];
                  if (httpCodesToNotRetry.includes(status)) return false;
               }
               return failureCount <= 1;
            },
            retryDelay: 500,
            refetchOnWindowFocus: false,
         },
         mutations: {
            retry: (failureCount, error) => {
               if (error && typeof error === "object" && "status" in error) {
                  const status = error.status as number;
                  const httpCodesToNotRetry = [400, 401, 403, 404, 422];
                  if (httpCodesToNotRetry.includes(status)) return false;
               }
               return failureCount <= 1;
            },
         },
      },
   });

   return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
