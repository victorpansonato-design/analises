export interface ApiResponse<T> {
   success: boolean;
   data: T;
   message?: string;
}

export interface ApiErrorDebug {
   file?: string;
   line?: number;
   trace?: string[];
}

export interface ApiErrorBody {
   code: string;
   message: string;
   loginUrl?: string;
   /** Mensagens prontas para a UI (ex.: guardas da transição que falharam). */
   detalhes?: string[];
   /** Em 409: quem alterou o registro por último. */
   atualizadoPor?: { id: string; nome: string };
}

export interface ApiErrorResponse {
   success: false;
   error: ApiErrorBody;
   debug?: ApiErrorDebug;
}
