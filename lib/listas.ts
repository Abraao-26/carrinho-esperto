// lib/listas.ts
// Guarda listas de compras nomeadas pelo usuário (ex: "Feira da semana"),
// salvas no navegador (localStorage), sem precisar de login.

export type ItemLista = { product_id: string; product_name: string };
export type ListaSalva = { id: string; nome: string; itens: ItemLista[]; criadaEm: string };

const CHAVE = 'carrinhoesperto_listas';

export function getListas(): ListaSalva[] {
  if (typeof window === 'undefined') return [];
  const salvo = localStorage.getItem(CHAVE);
  return salvo ? JSON.parse(salvo) : [];
}

export function salvarLista(nome: string, itens: ItemLista[]): ListaSalva {
  const listas = getListas();
  const nova: ListaSalva = {
    id: Date.now().toString(),
    nome,
    itens,
    criadaEm: new Date().toISOString(),
  };
  localStorage.setItem(CHAVE, JSON.stringify([nova, ...listas]));
  return nova;
}

export function getListaPorId(id: string): ListaSalva | null {
  return getListas().find((l) => l.id === id) || null;
}

export function excluirLista(id: string) {
  const restantes = getListas().filter((l) => l.id !== id);
  localStorage.setItem(CHAVE, JSON.stringify(restantes));
}