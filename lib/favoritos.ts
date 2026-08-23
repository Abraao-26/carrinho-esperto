// lib/favoritos.ts
// Guarda a lista de produtos favoritos no navegador do usuário (localStorage),
// então não precisa de login nem de tabela nova no banco por enquanto.

const CHAVE = 'carrinhoesperto_favoritos';

// Pega a lista de IDs de produtos favoritos
export function getFavoritos(): string[] {
  if (typeof window === 'undefined') return []; // proteção para rodar no servidor também
  const salvo = localStorage.getItem(CHAVE);
  return salvo ? JSON.parse(salvo) : [];
}

// Verifica se um produto específico é favorito
export function isFavorito(productId: string): boolean {
  return getFavoritos().includes(productId);
}

// Adiciona ou remove um produto dos favoritos (alterna)
export function toggleFavorito(productId: string): string[] {
  const atuais = getFavoritos();
  const novaLista = atuais.includes(productId)
    ? atuais.filter((id) => id !== productId)
    : [...atuais, productId];
  localStorage.setItem(CHAVE, JSON.stringify(novaLista));
  return novaLista;
}