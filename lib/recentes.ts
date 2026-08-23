// lib/recentes.ts
// Guarda no navegador os últimos produtos que a pessoa visualizou,
// para mostrar um atalho de "continuar de onde parou" na Home.

const CHAVE = 'carrinhoesperto_recentes';
const MAXIMO = 6;

type ProdutoRecente = { id: string; name: string };

export function getRecentes(): ProdutoRecente[] {
  if (typeof window === 'undefined') return [];
  const salvo = localStorage.getItem(CHAVE);
  return salvo ? JSON.parse(salvo) : [];
}

// Registra que um produto foi visto, colocando ele no topo da lista
export function registrarVisualizacao(produto: ProdutoRecente) {
  const atuais = getRecentes().filter((p) => p.id !== produto.id);
  const nova = [produto, ...atuais].slice(0, MAXIMO);
  localStorage.setItem(CHAVE, JSON.stringify(nova));
}