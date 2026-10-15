/**
 * Itens do menu lateral. O sistema nasce como "hub da captação" (docs/09 §1): novos módulos (CRM,
 * vestibular, bolsas) entram aqui com uma linha, no mesmo shell e sem nova tela de login.
 */
import { Calculator, ChartPie, ClipboardCheck, GraduationCap, LibraryBig, type LucideIcon } from "lucide-react";

export interface ItemNavegacao {
   rotulo: string;
   caminho: string;
   icone: LucideIcon;
   /** Capacidade exigida para o item aparecer (ex.: `VER_GESTAO`). Sem ela, todos veem. */
   capacidade?: "VER_GESTAO";
   /** Acesso exigido para o item aparecer (ex.: só Coordenadores). */
   acesso?: "COORDENACAO";
}

export const NAVEGACAO: readonly ItemNavegacao[] = [
   { rotulo: "Pareceres", caminho: "/pareceres", icone: GraduationCap, acesso: "COORDENACAO" },
   { rotulo: "Análises", caminho: "/analises", icone: ClipboardCheck },
   { rotulo: "Cálculo de Dispensa", caminho: "/calculo-dispensa", icone: Calculator },
   { rotulo: "Matriz Curricular", caminho: "/matriz-curricular", icone: LibraryBig },
   { rotulo: "Gestão comercial", caminho: "/gestao", icone: ChartPie, capacidade: "VER_GESTAO" },
];
