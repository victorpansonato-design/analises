/** Página pública do aluno (`/acompanhe/:token`): fora do login e do layout da equipe. */
import { useEffect } from "react";
import { useParams } from "react-router-dom";

import { AcompanhamentoAluno } from "@/features/acompanhamento";

export default function AcompanhamentoPage() {
   const { token = "" } = useParams();
   useEffect(() => {
      const anterior = document.title;
      document.title = "Acompanhe sua matrícula · UniAnchieta";
      return () => {
         document.title = anterior;
      };
   }, []);
   return <AcompanhamentoAluno token={token} />;
}
