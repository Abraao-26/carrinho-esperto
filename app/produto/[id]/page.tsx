// app/produto/[id]/page.tsx
// Detalhe do produto: foto, preços atuais em cada mercado + gráfico de histórico.
// Também registra a visualização para aparecer em "Continue de onde parou" na Home.

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Package, CheckCircle2, TrendingUp } from 'lucide-react';
import { SkeletonList } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { registrarVisualizacao } from '@/lib/recentes';

type Produto = { id: string; name: string; category: string; image_url: string | null };
type PrecoAtual = { supermarket_name: string; price: number; updated_at: string };
type PontoHistorico = { data: string; preco: number };

export default function DetalheProduto() {
  const params = useParams();
  const id = params?.id as string;

  const [produto, setProduto] = useState<Produto | null>(null);
  const [precos, setPrecos] = useState<PrecoAtual[]>([]);
  const [historicoPorMercado, setHistoricoPorMercado] = useState<Record<string, PontoHistorico[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function carregar() {
      setLoading(true);

      const { data: dadosProduto } = await supabase
        .from('products')
        .select('id, name, category, image_url')
        .eq('id', id)
        .single();
      setProduto(dadosProduto);

      if (dadosProduto) {
        registrarVisualizacao({ id: dadosProduto.id, name: dadosProduto.name });
      }

      const { data: dadosPrecos } = await supabase
        .from('product_prices')
        .select('price, updated_at, supermarkets(name, trade_name)')
        .eq('product_id', id);

      setPrecos(
        (dadosPrecos || []).map((p: any) => ({
          supermarket_name: p.supermarkets.trade_name || p.supermarkets.name,
          price: p.price,
          updated_at: p.updated_at,
        }))
      );

      const { data: historico } = await supabase
        .from('price_history')
        .select('price, created_at, supermarkets(name, trade_name)')
        .eq('product_id', id)
        .order('created_at', { ascending: true });

      const agrupado: Record<string, PontoHistorico[]> = {};
      (historico || []).forEach((h: any) => {
        const nomeMercado = h.supermarkets.trade_name || h.supermarkets.name;
        if (!agrupado[nomeMercado]) agrupado[nomeMercado] = [];
        agrupado[nomeMercado].push({
          data: new Date(h.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          preco: h.price,
        });
      });
      setHistoricoPorMercado(agrupado);

      setLoading(false);
    }

    carregar();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <SkeletonList quantidade={2} />
      </main>
    );
  }

  if (!produto) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <EmptyState icon={Package} titulo="Produto não encontrado" />
      </main>
    );
  }

  const menorPreco = precos.length > 0 ? Math.min(...precos.map((p) => p.price)) : 0;

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        {produto.image_url ? (
          <img src={produto.image_url} alt={produto.name} className="w-20 h-20 rounded-2xl object-cover shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#f7f8fa' }}>
            <Package size={32} className="text-gray-300" />
          </div>
        )}
        <div>
          <p className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 inline-block mb-1">
            {produto.category}
          </p>
          <h1 className="font-display font-bold text-2xl text-gray-900">{produto.name}</h1>
        </div>
      </div>

      <div className="card p-5 mb-8">
        <h2 className="font-semibold text-gray-900 mb-3">Preços atuais</h2>
        <div className="space-y-2">
          {precos.map((p, i) => {
            const maisBarato = p.price === menorPreco;
            return (
              <div
                key={i}
                className="flex justify-between items-center px-4 py-3 rounded-xl"
                style={{ backgroundColor: maisBarato ? '#e6f7f0' : '#f7f8fa' }}
              >
                <div>
                  <span className="text-gray-700 font-medium block">{p.supermarket_name}</span>
                  <span className="text-xs text-gray-400">
                    Atualizado em {new Date(p.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {maisBarato && (
                    <span className="badge-economia">
                      <CheckCircle2 size={12} /> mais barato
                    </span>
                  )}
                  <span className="font-bold" style={{ color: maisBarato ? 'var(--success)' : 'var(--ink)' }}>
                    R$ {p.price.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
        <TrendingUp size={20} style={{ color: 'var(--brand)' }} />
        Histórico de preço
      </h2>

      {Object.keys(historicoPorMercado).length === 0 && (
        <EmptyState
          icon={TrendingUp}
          titulo="Ainda sem histórico"
          descricao="O histórico aparece conforme o preço deste produto for atualizado ao longo do tempo."
        />
      )}

      <div className="space-y-6">
        {Object.entries(historicoPorMercado).map(([nomeMercado, pontos]) => (
          <div key={nomeMercado} className="card p-5">
            <p className="font-medium text-gray-900 mb-3">{nomeMercado}</p>
            {pontos.length < 2 ? (
              <p className="text-sm text-gray-400">
                Ainda não há pontos suficientes para desenhar um gráfico aqui — volte quando o preço for atualizado de novo.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={pontos}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="data" fontSize={12} stroke="#9ca3af" />
                  <YAxis fontSize={12} stroke="#9ca3af" width={50} />
                  <Tooltip formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Preço']} />
                  <Line type="monotone" dataKey="preco" stroke="#1a3d7c" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}