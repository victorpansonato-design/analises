/**
 * Cursos e matrizes FICTÍCIOS (8 cursos, 40 a 47 disciplinas por matriz). Servem para a análise ser
 * crível: períodos, CH e atividades exigidas variam por curso. Nada aqui é a grade real da
 * UniAnchieta.
 */
import type { Modalidade, Turno } from "@/features/casos";

export interface DisciplinaMatriz {
   id: string;
   codigo?: string;
   periodo: number | null;
   nome: string;
   ch: number;
}

export interface CursoMock {
   id: string;
   nome: string;
   turnos: Turno[];
   modalidades: Modalidade[];
   coordenadorId: string;
   vagasDisponiveis: number | null;
   periodos: number;
   atividadesComplementaresExigidas: number;
   praticaExtensionistaExigida: number;
   /** Curso de pós com disciplinas personalizadas (docs/06): nenhum nesta seed além de Psicologia. */
   personalizadasPos: string[];
   grade: (readonly string[])[];
   semPeriodo: string[];
}

const CH_PADRAO = [60, 60, 80, 40, 60, 80] as const;

export const CURSOS: readonly CursoMock[] = [
   {
      id: "adm",
      nome: "Administração",
      turnos: ["MATUTINO", "NOTURNO"],
      modalidades: ["PRESENCIAL", "SEMIPRESENCIAL", "EAD"],
      coordenadorId: "u-coo-adm",
      vagasDisponiveis: 34,
      periodos: 8,
      atividadesComplementaresExigidas: 200,
      praticaExtensionistaExigida: 310,
      personalizadasPos: [],
      grade: [
         [
            "Fundamentos da administração",
            "Contabilidade introdutória",
            "Comunicação empresarial",
            "Matemática aplicada aos negócios",
            "Economia I",
            "Metodologia científica",
         ],
         [
            "Teoria geral da administração",
            "Contabilidade gerencial",
            "Estatística aplicada",
            "Economia II",
            "Direito empresarial",
            "Psicologia organizacional",
         ],
         [
            "Gestão de pessoas",
            "Matemática financeira",
            "Marketing I",
            "Sistemas de informação gerencial",
            "Ética e cidadania",
            "Comportamento do consumidor",
         ],
         [
            "Administração financeira I",
            "Marketing II",
            "Gestão da produção",
            "Logística empresarial",
            "Pesquisa operacional",
            "Gestão de serviços",
         ],
         ["Administração financeira II", "Gestão de projetos", "Gestão da qualidade", "Direito do trabalho", "Negociação e vendas"],
         ["Planejamento estratégico", "Empreendedorismo", "Comércio exterior", "Gestão de custos", "Governança corporativa"],
         ["Gestão da inovação", "Finanças corporativas", "Gestão ambiental", "Consultoria empresarial", "Trabalho de conclusão I"],
         ["Jogos de empresas", "Gestão pública", "Liderança e equipes", "Trabalho de conclusão II", "Tópicos em gestão digital"],
      ],
      semPeriodo: ["Estágio supervisionado"],
   },
   {
      id: "dir",
      nome: "Direito",
      turnos: ["MATUTINO", "NOTURNO"],
      modalidades: ["PRESENCIAL"],
      coordenadorId: "u-coo-dir",
      vagasDisponiveis: 12,
      periodos: 10,
      atividadesComplementaresExigidas: 240,
      praticaExtensionistaExigida: 370,
      personalizadasPos: [],
      grade: [
         ["Introdução ao estudo do direito", "Teoria geral do Estado", "Sociologia jurídica", "Filosofia geral", "Comunicação e expressão"],
         ["Direito constitucional I", "Direito civil: parte geral", "Economia política", "Metodologia científica", "Antropologia jurídica"],
         ["Direito constitucional II", "Direito civil: obrigações", "Direito penal: parte geral", "Teoria geral do processo"],
         ["Direito civil: contratos", "Direito penal: teoria da pena", "Direito processual civil I", "Direito administrativo I"],
         [
            "Direito civil: coisas",
            "Direito penal: crimes em espécie",
            "Direito processual civil II",
            "Direito administrativo II",
            "Direito do trabalho I",
         ],
         [
            "Direito civil: família",
            "Direito processual penal I",
            "Direito do trabalho II",
            "Direito empresarial I",
            "Direito tributário I",
         ],
         [
            "Direito civil: sucessões",
            "Direito processual penal II",
            "Direito empresarial II",
            "Direito tributário II",
            "Ética profissional",
         ],
         ["Direito internacional", "Direito ambiental", "Direito do consumidor", "Processo do trabalho", "Prática jurídica I"],
         ["Direito previdenciário", "Mediação e arbitragem", "Prática jurídica II", "Trabalho de conclusão I"],
         ["Direitos humanos", "Direito digital", "Prática jurídica III", "Trabalho de conclusão II"],
      ],
      semPeriodo: ["Estágio supervisionado"],
   },
   {
      id: "eng",
      nome: "Engenharia Civil",
      turnos: ["NOTURNO", "INTEGRAL"],
      modalidades: ["PRESENCIAL"],
      coordenadorId: "u-coo-eng",
      vagasDisponiveis: 20,
      periodos: 10,
      atividadesComplementaresExigidas: 200,
      praticaExtensionistaExigida: 360,
      personalizadasPos: [],
      grade: [
         ["Cálculo I", "Geometria analítica", "Química geral", "Desenho técnico", "Introdução à engenharia"],
         ["Cálculo II", "Física I", "Álgebra linear", "Desenho assistido por computador", "Metodologia científica"],
         ["Cálculo III", "Física II", "Mecânica geral", "Topografia", "Estatística aplicada"],
         ["Resistência dos materiais I", "Fenômenos de transporte", "Materiais de construção I", "Geologia aplicada"],
         ["Resistência dos materiais II", "Hidráulica", "Materiais de construção II", "Teoria das estruturas I"],
         ["Mecânica dos solos", "Teoria das estruturas II", "Instalações hidrossanitárias", "Construção civil I"],
         ["Estruturas de concreto I", "Fundações", "Hidrologia", "Construção civil II"],
         ["Estruturas de concreto II", "Estruturas de aço", "Saneamento", "Estradas"],
         ["Planejamento de obras", "Pontes", "Gestão ambiental", "Trabalho de conclusão I"],
         ["Patologia das construções", "Engenharia de tráfego", "Trabalho de conclusão II"],
      ],
      semPeriodo: ["Estágio supervisionado"],
   },
   {
      id: "psi",
      nome: "Psicologia",
      turnos: ["MATUTINO", "NOTURNO"],
      modalidades: ["PRESENCIAL"],
      coordenadorId: "u-coo-psi",
      vagasDisponiveis: 8,
      periodos: 10,
      atividadesComplementaresExigidas: 200,
      praticaExtensionistaExigida: 400,
      personalizadasPos: ["Tópicos em avaliação neuropsicológica", "Seminário de casos clínicos"],
      grade: [
         ["História da psicologia", "Neuroanatomia", "Filosofia e psicologia", "Sociologia", "Comunicação e expressão"],
         ["Psicologia do desenvolvimento I", "Neurofisiologia", "Antropologia", "Metodologia científica", "Estatística aplicada"],
         ["Psicologia do desenvolvimento II", "Teorias da personalidade", "Processos psicológicos básicos", "Psicologia social I"],
         ["Psicopatologia I", "Técnicas de entrevista", "Psicologia social II", "Avaliação psicológica I"],
         ["Psicopatologia II", "Avaliação psicológica II", "Psicologia escolar", "Teorias psicanalíticas"],
         ["Psicologia organizacional", "Terapia cognitivo-comportamental", "Psicologia da saúde", "Ética profissional"],
         ["Psicologia hospitalar", "Psicologia jurídica", "Grupos e instituições", "Estágio básico I"],
         ["Neuropsicologia", "Psicofarmacologia", "Estágio básico II", "Saúde mental coletiva"],
         ["Estágio específico I", "Psicologia clínica", "Trabalho de conclusão I"],
         ["Estágio específico II", "Psicologia e políticas públicas", "Trabalho de conclusão II"],
      ],
      semPeriodo: [],
   },
   {
      id: "cc",
      nome: "Ciência da Computação",
      turnos: ["NOTURNO"],
      modalidades: ["PRESENCIAL", "EAD"],
      coordenadorId: "u-coo-cc",
      vagasDisponiveis: 41,
      periodos: 8,
      atividadesComplementaresExigidas: 200,
      praticaExtensionistaExigida: 320,
      personalizadasPos: [],
      grade: [
         [
            "Algoritmos e lógica de programação",
            "Fundamentos de matemática",
            "Arquitetura de computadores",
            "Comunicação e expressão",
            "Introdução à computação",
         ],
         ["Estruturas de dados I", "Cálculo I", "Matemática discreta", "Programação orientada a objetos", "Metodologia científica"],
         [
            "Estruturas de dados II",
            "Cálculo II",
            "Banco de dados I",
            "Sistemas operacionais",
            "Estatística aplicada",
            "Paradigmas de programação",
         ],
         ["Banco de dados II", "Redes de computadores", "Engenharia de software I", "Teoria da computação", "Álgebra linear"],
         ["Engenharia de software II", "Desenvolvimento web", "Compiladores", "Computação gráfica", "Programação para dispositivos móveis"],
         [
            "Inteligência artificial",
            "Sistemas distribuídos",
            "Segurança da informação",
            "Interação humano-computador",
            "Análise de algoritmos",
         ],
         ["Aprendizado de máquina", "Computação em nuvem", "Gestão de projetos de software", "Trabalho de conclusão I"],
         ["Tópicos avançados em computação", "Empreendedorismo", "Ética e computação", "Trabalho de conclusão II"],
      ],
      semPeriodo: ["Estágio supervisionado"],
   },
   {
      id: "enf",
      nome: "Enfermagem",
      turnos: ["MATUTINO", "INTEGRAL"],
      modalidades: ["PRESENCIAL"],
      coordenadorId: "u-coo-enf",
      vagasDisponiveis: null,
      periodos: 10,
      atividadesComplementaresExigidas: 160,
      praticaExtensionistaExigida: 400,
      personalizadasPos: [],
      grade: [
         ["Anatomia humana", "Biologia celular", "Histologia e embriologia", "Sociologia da saúde", "Comunicação e expressão"],
         ["Fisiologia humana", "Bioquímica", "Microbiologia", "Metodologia científica", "História da enfermagem"],
         ["Farmacologia", "Imunologia", "Parasitologia", "Semiologia e semiotécnica I", "Epidemiologia"],
         ["Semiologia e semiotécnica II", "Patologia geral", "Nutrição e dietética", "Saúde coletiva I"],
         ["Enfermagem em saúde do adulto I", "Saúde coletiva II", "Enfermagem em saúde mental", "Bioestatística"],
         ["Enfermagem em saúde do adulto II", "Enfermagem em saúde da mulher", "Enfermagem pediátrica", "Enfermagem neonatal"],
         ["Enfermagem em urgência e emergência", "Enfermagem em centro cirúrgico", "Gestão em enfermagem I", "Ética e bioética"],
         ["Enfermagem em UTI", "Gestão em enfermagem II", "Enfermagem em saúde do idoso", "Trabalho de conclusão I"],
         ["Estágio curricular I", "Educação em saúde", "Trabalho de conclusão II"],
         ["Estágio curricular II", "Tópicos em enfermagem"],
      ],
      semPeriodo: [],
   },
   {
      id: "cont",
      nome: "Ciências Contábeis",
      turnos: ["NOTURNO"],
      modalidades: ["PRESENCIAL", "SEMIPRESENCIAL", "EAD"],
      coordenadorId: "u-coo-cont",
      vagasDisponiveis: 27,
      periodos: 8,
      atividadesComplementaresExigidas: 200,
      praticaExtensionistaExigida: 300,
      personalizadasPos: [],
      grade: [
         ["Contabilidade básica", "Matemática aplicada", "Teoria geral da administração", "Comunicação empresarial", "Economia I"],
         ["Contabilidade intermediária", "Matemática financeira", "Estatística aplicada", "Direito empresarial", "Metodologia científica"],
         ["Contabilidade avançada", "Contabilidade de custos", "Direito tributário", "Economia II", "Ética e cidadania"],
         [
            "Análise das demonstrações contábeis",
            "Contabilidade tributária I",
            "Contabilidade gerencial",
            "Direito trabalhista",
            "Matemática atuarial",
         ],
         ["Contabilidade tributária II", "Auditoria I", "Contabilidade pública", "Controladoria", "Orçamento empresarial"],
         ["Auditoria II", "Perícia contábil", "Mercado de capitais", "Sistemas de informação contábil", "Finanças corporativas"],
         ["Contabilidade internacional", "Planejamento tributário", "Gestão de custos", "Trabalho de conclusão I", "Laboratório contábil"],
         ["Contabilidade do terceiro setor", "Teoria da contabilidade", "Trabalho de conclusão II", "Empreendedorismo"],
      ],
      semPeriodo: ["Estágio supervisionado"],
   },
   {
      id: "ped",
      nome: "Pedagogia",
      turnos: ["MATUTINO", "NOTURNO"],
      modalidades: ["PRESENCIAL", "EAD"],
      coordenadorId: "u-coo-ped",
      vagasDisponiveis: 30,
      periodos: 8,
      atividadesComplementaresExigidas: 200,
      praticaExtensionistaExigida: 320,
      personalizadasPos: [],
      grade: [
         ["Fundamentos da educação", "História da educação", "Comunicação e expressão", "Filosofia da educação", "Metodologia científica"],
         [
            "Psicologia da educação",
            "Sociologia da educação",
            "Didática geral",
            "Políticas públicas em educação",
            "Leitura e produção de texto",
            "Antropologia e educação",
         ],
         ["Alfabetização e letramento", "Educação infantil", "Currículo e planejamento", "Educação inclusiva", "Libras"],
         [
            "Metodologia do ensino de matemática",
            "Metodologia do ensino de língua portuguesa",
            "Avaliação da aprendizagem",
            "Tecnologias educacionais",
         ],
         [
            "Metodologia do ensino de ciências",
            "Metodologia do ensino de história e geografia",
            "Gestão escolar",
            "Literatura infantil",
            "Educação física escolar",
         ],
         [
            "Educação de jovens e adultos",
            "Coordenação pedagógica",
            "Arte e educação",
            "Educação ambiental",
            "Educação em direitos humanos",
         ],
         ["Pesquisa em educação", "Ludicidade e aprendizagem", "Ética profissional", "Trabalho de conclusão I", "Orientação educacional"],
         ["Educação e diversidade", "Psicopedagogia", "Trabalho de conclusão II", "Neurociência e aprendizagem"],
      ],
      semPeriodo: ["Estágio supervisionado"],
   },
];

const POR_ID = new Map(CURSOS.map(c => [c.id, c]));

export function cursoPorId(id: string): CursoMock {
   const c = POR_ID.get(id);
   if (!c) throw new Error(`Curso desconhecido: ${id}`);
   return c;
}

/** Disciplinas da matriz vigente, com CH estável por posição. */
export function disciplinasDaMatriz(cursoId: string): DisciplinaMatriz[] {
   const c = cursoPorId(cursoId);
   const itens: DisciplinaMatriz[] = [];
   c.grade.forEach((nomes, i) =>
      nomes.forEach((nome, j) =>
         itens.push({
            id: `${c.id}-${i + 1}${String(j + 1).padStart(2, "0")}`,
            periodo: i + 1,
            nome,
            ch: CH_PADRAO[(i + j) % CH_PADRAO.length],
         }),
      ),
   );
   c.semPeriodo.forEach((nome, j) => itens.push({ id: `${c.id}-x${j + 1}`, periodo: null, nome, ch: 160 }));
   const codigos = new Set<string>();
   itens.forEach((item, indice) => {
      const palavras =
         item.nome
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .match(/[A-Z0-9]+/g) ?? [];
      const significativas = palavras.filter(p => !["A", "AO", "AS", "DA", "DAS", "DE", "DO", "DOS", "E", "EM"].includes(p));
      const sigla = (significativas.map(p => p[0]).join("") + palavras.join("")).slice(0, 5).padEnd(5, "X");
      let codigo = `26_${sigla}_${item.ch}`;
      if (codigos.has(codigo)) codigo = `26_${sigla.slice(0, 3)}${String(indice + 1).padStart(2, "0")}_${item.ch}`;
      codigos.add(codigo);
      item.codigo = codigo;
   });
   return itens;
}

export interface MatrizMock {
   id: string;
   cursoId: string;
   codigo: string;
   vigente: boolean;
   chTotal: number;
   periodos: number;
   atividadesComplementaresExigidas: number;
   praticaExtensionistaExigida: number;
}

/** Duas matrizes por curso: a vigente (20262) e a anterior (20241), para "Trocar matriz". */
export function matrizesDoCurso(cursoId: string): MatrizMock[] {
   const c = cursoPorId(cursoId);
   const chTotal = disciplinasDaMatriz(cursoId).reduce((s, d) => s + d.ch, 0);
   return [
      {
         id: `${c.id}-20262`,
         cursoId: c.id,
         codigo: "20262",
         vigente: true,
         chTotal,
         periodos: c.periodos,
         atividadesComplementaresExigidas: c.atividadesComplementaresExigidas,
         praticaExtensionistaExigida: c.praticaExtensionistaExigida,
      },
      {
         id: `${c.id}-20241`,
         cursoId: c.id,
         codigo: "20241",
         vigente: false,
         chTotal: chTotal - 120,
         periodos: c.periodos,
         atividadesComplementaresExigidas: c.atividadesComplementaresExigidas,
         praticaExtensionistaExigida: c.praticaExtensionistaExigida - 40,
      },
   ];
}

export function matrizPorId(id: string): MatrizMock | null {
   const cursoId = id.split("-")[0];
   if (!POR_ID.has(cursoId)) return null;
   return matrizesDoCurso(cursoId).find(m => m.id === id) ?? null;
}

/** Ementa curta e genérica (para a comparação lado a lado não ficar vazia). */
export function ementa(nome: string): string {
   return `Conceitos fundamentais de ${nome.toLowerCase()}; aplicações práticas; estudos de caso e avaliação por projeto.`;
}

export const IES_FICTICIAS = [
   { id: "ies-01", nome: "Faculdade Fictícia de Gestão", sigla: "FFG" },
   { id: "ies-02", nome: "Centro Universitário Exemplo Paulista", sigla: "CUEP" },
   { id: "ies-03", nome: "Universidade Modelo do Interior", sigla: "UMI" },
   { id: "ies-04", nome: "Instituto de Ensino Superior Demonstração", sigla: "IESD" },
   { id: "ies-05", nome: "Faculdade de Tecnologia Simulada", sigla: "FTS" },
   { id: "ies-06", nome: "Universidade Hipotética do Vale", sigla: "UHV" },
   { id: "ies-07", nome: "Centro Universitário Ilustrativo", sigla: null },
   { id: "ies-08", nome: "Faculdade Teste de Ciências Humanas", sigla: "FTCH" },
] as const;

export const CICLOS = ["2026.2", "2027.1"] as const;
