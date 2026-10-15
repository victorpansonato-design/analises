/**
 * Lookup por CPF (contrato `GET /pessoas/lookup`): pré-preenche o protocolo e detecta vínculo e caso
 * duplicado. Só dispara com 11 dígitos de CPF válido, para não consultar a cada tecla.
 */
import { useQuery } from "@tanstack/react-query";

import api from "@/services/api";
import type { ApiResponse } from "@/services/types";

import { cpfValido, LookupPessoaSchema } from "@/features/protocolo/types/protocolo.schema";

export const protocoloKeys = {
   all: ["protocolo"] as const,
   lookup: (cpf: string) => [...protocoloKeys.all, "lookup", cpf] as const,
};

export function useLookupPessoa(cpf: string) {
   const digitos = cpf.replace(/\D/g, "");
   return useQuery({
      queryKey: protocoloKeys.lookup(digitos),
      enabled: cpfValido(digitos),
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>("/pessoas/lookup", { params: { cpf: digitos } });
         return LookupPessoaSchema.parse(data.data);
      },
      staleTime: 60_000,
   });
}
