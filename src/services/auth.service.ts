import api from "@/services/api";
import type { ApiResponse } from "@/services/types";
import type { AuthUser } from "@/types/auth.types";

class AuthService {
   async me(): Promise<AuthUser> {
      const destinationUrl = new URL(window.location.href);

      const { data } = await api.get<ApiResponse<AuthUser>>("/funcionarios/me", {
         params: { destination: destinationUrl.toString() },
      });
      return data.data;
   }

   async logout(): Promise<void> {
      await api.post("/logout");
   }
}

export const authService = new AuthService();
