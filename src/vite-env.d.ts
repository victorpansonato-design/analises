/// <reference types="vite/client" />

interface ImportMetaEnv {
   readonly VITE_API_URL?: string;
   readonly VITE_BASE_URL?: string;
   readonly VITE_LOGIN_URL?: string;
   /** "true" liga os dados simulados (MSW). Ver `src/mocks`. */
   readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
   readonly env: ImportMetaEnv;
}
