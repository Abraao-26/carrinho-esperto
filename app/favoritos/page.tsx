// app/favoritos/page.tsx
// Mostra todos os produtos marcados como favoritos, com comparação de preço,
// igual à tela de busca.

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getFavoritos, toggleFavorito } from '@/lib/favoritos';
import { Heart, CheckCircle2 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

type ResultadoProduto = {
  product_id: string;
  product_name: string;
  precos: { supermarket_name: string; price: number }[];
};

export default function Favoritos() {
  const [resultados, setResultados] = useState<ResultadoProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  async function carregarFavoritos() {
    setLoading(true);
    const ids = getFavoritos();

    if (ids.length === 0) {
      setResultados([]);
      setLoading(false);
      return;
    }

    const { data: produtos } = await supabase.from('products').select('id, name').in('id', ids);

    const montado: ResultadoProduto[] = [];
    for (const produto of produtos || []) {
      const { data: precos } = await supabase
        .from('product_prices')
        .select('price, supermarkets(name, trade_name)')
        .eq('product_id', produto.id);

      montado.push({
        product_id: produto.id,
        product_name: produto.name,
        precos: (precos || []).map((p: any) => ({
          supermarket_name: p.supermarkets.trade_name || p.supermarkets.name,
          price: p.price,
        })),
      });
    }

    setResultados(montado);
    setLoading(false);
  }

  useEffect(() => {
    carregarFavoritos();
  }, []);

  function remover(productId: string, nome: string) {
    toggleFavorito(productId);
    toast.sucesso(`${nome} removido dos favoritos.`);
    carregarFavoritos();
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
        Sua lista pessoal
      </p>
      <h1
        className="font-display font-bold text-2xl mb-6 flex items-center gap-2"
        style={{ color: 'var(--brand)' }}
      >
        <Heart size={26} /> Favoritos
      </h1>

      {loading && <SkeletonList quantidade={2} />}

      {!loading && resultados.length === 0 && (
        <EmptyState
          icon={Heart}
          titulo="Nenhum favorito ainda"
          descricao="Na tela de Buscar, clique no coração de um produto para adicioná-lo aqui."
        />
      )}

      <div className="space-y-4">
        {resultados.map((produto) => {
          const menorPreco = Math.min(...produto.precos.map((p) => p.price));
          return (
            <div key={produto.product_id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-lg text-gray-900">{produto.product_name}</h2>
                <button
                  onClick={() => remover(produto.product_id, produto.product_name)}
                  className="text-red-500"
                  title="Remover dos favoritos"
                >
                  <Heart size={20} fill="currentColor" />
                </button>
              </div>
              <div className="space-y-2">
                {produto.precos.map((p, i) => {
                  const maisBarato = p.price === menorPreco;
                  return (
                    <div
                      key={i}
                      className="flex justify-between items-center px-4 py-3 rounded-xl"
                      style={{ backgroundColor: maisBarato ? '#e6f7f0' : '#f7f8fa' }}
                    >
                      <span className="text-gray-700 font-medium">{p.supermarket_name}</span>
                      <div className="flex items-center gap-2">
                        {maisBarato && (
                          <span className="badge-economia">
                            <CheckCircle2 size={12} /> mais barato
                          </span>
                        )}
                        <span
                          className="font-bold"
                          style={{ color: maisBarato ? 'var(--success)' : 'var(--ink)' }}
                        >
                          R$ {p.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}