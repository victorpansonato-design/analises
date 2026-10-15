export interface DisciplinaDispensa {
   id: string;
   nome: string;
   creditos: number;
}

export interface GradeDispensa {
   id: string;
   ano: number;
   periodo: string;
   curso: string;
   curriculo: string;
   turno: string;
   serie: number;
   /** Valor mensal integral em centavos, distribuído proporcionalmente aos créditos. */
   contrato: number;
   disciplinas: DisciplinaDispensa[];
}

export interface DescontosDispensa {
   perfil: "normal" | "ceu" | "prouni50";
   bolsa: number;
   fixo: number;
   antecipado1: number;
   antecipado2: number;
}

export interface MensalidadeDispensa {
   id: string;
   competencia: string;
   vencimento: string;
   valor: number;
   pagamento: "Pago" | "Em aberto";
   condicao: "regular" | "antecipado1" | "antecipado2";
}

export interface VinculoDispensa {
   gradeId: string;
   dispensadas: string[];
   descontos: DescontosDispensa;
   mensalidades: MensalidadeDispensa[];
}

export interface AlunoDispensa {
   ra: string;
   nome: string;
   vinculos: VinculoDispensa[];
}
