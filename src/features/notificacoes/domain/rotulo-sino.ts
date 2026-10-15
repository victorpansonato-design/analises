/** Rótulo acessível do sino: a contagem por extenso ("Notificações, 3 não lidas"). */
import { plural } from "@/lib/format";

export function rotuloSino(naoLidas: number): string {
   return naoLidas === 0 ? "Notificações, nenhuma não lida" : `Notificações, ${plural(naoLidas, "não lida", "não lidas")}`;
}
