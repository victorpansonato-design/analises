export interface AuthUser {
   usuario: string;
   nome: string;
   email: string;
   setor?: string;
}

export interface AuthContextData {
   user: AuthUser | null;
   isLoading: boolean;
   isAuthenticated: boolean;
   logout: () => Promise<void>;
}
