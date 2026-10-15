/**
 * Pessoas FICTÍCIAS. Nomes combinados de listas genéricas, CPF com dígito verificador válido mas
 * inventado, celular e e-mail em domínio reservado (`example.com`). Nenhum dado real de aluno.
 */
import type { Prng } from "@/mocks/lib/prng";

const PRENOMES = [
   "Ana",
   "Beatriz",
   "Bruna",
   "Camila",
   "Carolina",
   "Clara",
   "Daniela",
   "Eduarda",
   "Fernanda",
   "Gabriela",
   "Helena",
   "Isabela",
   "Joana",
   "Júlia",
   "Larissa",
   "Laura",
   "Letícia",
   "Luana",
   "Manuela",
   "Mariana",
   "Natália",
   "Paula",
   "Rafaela",
   "Renata",
   "Sofia",
   "Tatiane",
   "Valéria",
   "Vitória",
   "Yasmin",
   "Aline",
   "André",
   "Arthur",
   "Bernardo",
   "Caio",
   "Daniel",
   "Diego",
   "Eduardo",
   "Felipe",
   "Gabriel",
   "Gustavo",
   "Heitor",
   "Henrique",
   "Igor",
   "João",
   "Leonardo",
   "Lucas",
   "Marcelo",
   "Mateus",
   "Miguel",
   "Murilo",
   "Otávio",
   "Pedro",
   "Rafael",
   "Ricardo",
   "Rodrigo",
   "Samuel",
   "Thiago",
   "Vinícius",
   "Wesley",
   "Kauã",
] as const;

const SOBRENOMES = [
   "Almeida",
   "Andrade",
   "Araújo",
   "Barbosa",
   "Barros",
   "Batista",
   "Borges",
   "Campos",
   "Cardoso",
   "Carvalho",
   "Castro",
   "Correia",
   "Costa",
   "Dias",
   "Duarte",
   "Farias",
   "Fernandes",
   "Ferreira",
   "Freitas",
   "Gomes",
   "Lima",
   "Lopes",
   "Machado",
   "Martins",
   "Melo",
   "Mendes",
   "Monteiro",
   "Moraes",
   "Moreira",
   "Nascimento",
   "Nunes",
   "Oliveira",
   "Pereira",
   "Pinto",
   "Ramos",
   "Reis",
   "Ribeiro",
   "Rocha",
   "Rodrigues",
   "Santana",
   "Santos",
   "Silva",
   "Soares",
   "Souza",
   "Teixeira",
   "Vieira",
] as const;

const DDDS = ["11", "11", "11", "11", "19", "13", "15", "12"] as const;

export function gerarNome(r: Prng): string {
   const pre = r.pick(PRENOMES);
   const s1 = r.pick(SOBRENOMES);
   let s2 = r.pick(SOBRENOMES);
   if (s2 === s1) s2 = r.pick(SOBRENOMES);
   return r.chance(0.55) ? `${pre} ${s1} ${s2}` : `${pre} ${s2}`;
}

function digito(base: number[]): number {
   const n = base.length + 1;
   const soma = base.reduce((s, d, i) => s + d * (n - i), 0);
   const resto = (soma * 10) % 11;
   return resto === 10 ? 0 : resto;
}

/** CPF inventado com dígito verificador válido (só dígitos). */
export function gerarCpf(r: Prng): string {
   const base = Array.from({ length: 9 }, () => r.int(0, 9));
   if (base.every(d => d === base[0])) base[8] = (base[8] + 1) % 10;
   const d1 = digito(base);
   const d2 = digito([...base, d1]);
   return [...base, d1, d2].join("");
}

export function gerarCelular(r: Prng): string {
   return `${r.pick(DDDS)}9${String(r.int(10000000, 99999999))}`;
}

export function gerarEmail(nome: string, r: Prng): string {
   const base = nome
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .split(" ");
   return `${base[0]}.${base[base.length - 1]}${r.int(1, 99)}@example.com`;
}

export function gerarRa(r: Prng): string {
   return String(r.int(2100000, 2699999));
}

export function primeiroNome(nome: string): string {
   return nome.split(" ")[0];
}

export function mascararCelular(cel: string): string {
   const d = cel.replace(/\D/g, "");
   return `(${d.slice(0, 2)}) ${d.slice(2, 3)}****-${d.slice(-4)}`;
}

export function mascararEmail(email: string): string {
   const [u, dom] = email.split("@");
   return `${u.slice(0, 1)}***@${dom}`;
}
