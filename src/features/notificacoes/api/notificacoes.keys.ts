/** Query keys das notificações do usuário logado (trocar de papel nos mocks invalida tudo). */
export const notificacoesKeys = {
   all: ["notificacoes"] as const,
   lista: () => [...notificacoesKeys.all, "lista"] as const,
};
