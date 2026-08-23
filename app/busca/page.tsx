// app/busca/page.tsx
// Busca de produtos com foto, sugestões automáticas, filtro por categoria,
// ordenação por preço, favoritos e link para o detalhe.

'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Search, CheckCircle2, Loader2, Heart, ArrowUpDown, Package } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { SkeletonList } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { isFavorito, toggleFavorito } from '@/lib/favoritos';

type ResultadoPreco = { supermarket_name: string; price: number; updated_at: string };
type ResultadoProduto = { product_id: string; product_name: string; category: string; image_url: string | null; precos: ResultadoPreco[] };
type Sugestao = { id: string; name: string; category: string };

const CATEGORIAS = ['Todos', 'Mercearia', 'Hortifruti', 'Açougue', 'Limpeza', 'Higiene', 'Laticínios'];

export default function Busca() {
  const searchParams = useSearchParams();
  const [termo, setTermo] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [ordenacao, setOrdenacao] = useState<'relevancia' | 'menor_preco'>('relevancia');
  const [resultados, setResultados] = useState<ResultadoProduto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [jaBuscou, setJaBuscou] = useState(false);
  const [, forceUpdate] = useState(0);
  const toast = useToast();

  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (termo.trim().length < 2) {
      setSugestoes([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, category')
        .ilike('name', `%${termo}%`)
        .limit(6);
      setSugestoes(data || []);
    }, 250);

    return () => clearTimeout(timer);
  }, [termo]);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (caixaRef.current && !caixaRef.current.contains(e.target as Node)) {
        setMostrarSugestoes(false);
      }
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  function escolherSugestao(nome: string) {
    setTermo(nome);
    setMostrarSugestoes(false);
    buscarProdutos(nome);
  }

  async function buscarProdutos(termoBusca?: string, categoriaBusca?: string) {
    const valorTermo = termoBusca ?? termo;
    const valorCategoria = categoriaBusca ?? categoria;
    if (valorTermo.trim() === '' && valorCategoria === 'Todos') return;

    setMostrarSugestoes(false);
    setCarregando(true);
    setJaBuscou(true);

    let query = supabase.from('products').select('id, name, category, image_url');
    if (valorTermo.trim() !== '') query = query.ilike('name', `%${valorTermo}%`);
    if (valorCategoria !== 'Todos') query = query.eq('category', valorCategoria);

    const { data: produtos, error: erroProdutos } = await query;

    if (erroProdutos) {
      toast.erro('Erro ao buscar produtos.');
      setCarregando(false);
      return;
    }

    const resultadosMontados: ResultadoProduto[] = [];
    for (const produto of produtos || []) {
      const { data: precos } = await supabase
        .from('product_prices')
        .select('price, updated_at, supermarkets(name, trade_name)')
        .eq('product_id', produto.id);

      resultadosMontados.push({
        product_id: produto.id,
        product_name: produto.name,
        category: produto.category,
        image_url: produto.image_url,
        precos: (precos || []).map((p: any) => ({
          supermarket_name: p.supermarkets.trade_name || p.supermarkets.name,
          price: p.price,
          updated_at: p.updated_at,
        })),
      });
    }

    setResultados(resultadosMontados);
    setCarregando(false);
  }

  useEffect(() => {
    const q = searchParams.get('q');
    const cat = searchParams.get('categoria');
    if (cat) setCategoria(cat);
    if (q) setTermo(q);
    if (q || cat) buscarProdutos(q || '', cat || 'Todos');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function alternarFavorito(productId: string, nome: string) {
    const lista = toggleFavorito(productId);
    forceUpdate((n) => n + 1);
    toast.sucesso(lista.includes(productId) ? `${nome} adicionado aos favoritos!` : `${nome} removido dos favoritos.`);
  }

  const resultadosOrdenados = [...resultados].sort((a, b) => {
    if (ordenacao === 'menor_preco') {
      const menorA = Math.min(...a.precos.map((p) => p.price));
      const menorB = Math.min(...b.precos.map((p) => p.price));
      return menorA - menorB;
    }
    return 0;
  });

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
        Comparador de preços
      </p>
      <h1 className="font-display font-bold text-2xl mb-5" style={{ color: 'var(--brand)' }}>
        Buscar produto
      </h1>

      <div className="flex gap-2 mb-4 relative" ref={caixaRef}>
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value);
              setMostrarSugestoes(true);
            }}
            onFocus={() => setMostrarSugestoes(true)}
            onKeyDown={(e) => e.key === 'Enter' && buscarProdutos()}
            placeholder="Ex: arroz, feijão, óleo..."
            className="w-full border border-gray-200 rounded-full pl-11 pr-4 py-3 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          />

          {mostrarSugestoes && sugestoes.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-20">
              {sugestoes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => escolherSugestao(s.name)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-800">{s.name}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">{s.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => buscarProdutos()} disabled={carregando} className="btn-primary px-6 flex items-center gap-2">
          {carregando ? <Loader2 size={18} className="animate-spin" /> : 'Buscar'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCategoria(cat);
              buscarProdutos(termo, cat);
            }}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={{
              backgroundColor: categoria === cat ? 'var(--brand)' : 'white',
              color: categoria === cat ? 'white' : '#6b7280',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {resultados.length > 0 && (
        <button
          onClick={() => setOrdenacao(ordenacao === 'relevancia' ? 'menor_preco' : 'relevancia')}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 mb-6"
        >
          <ArrowUpDown size={14} />
          {ordenacao === 'relevancia' ? 'Ordenar por menor preço' : 'Ordenar por relevância'}
        </button>
      )}

      {carregando && <SkeletonList quantidade={2} />}

      {!carregando && (
        <div className="space-y-4">
          {resultadosOrdenados.map((produto) => {
            const menorPreco = Math.min(...produto.precos.map((p) => p.price));
            const favorito = isFavorito(produto.product_id);
            return (
              <div key={produto.product_id} className="card p-5">
                <div className="flex items-start gap-3 mb-3">
                  {produto.image_url ? (
                    <img src={produto.image_url} alt={produto.product_name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#f7f8fa' }}>
                      <Package size={22} className="text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/produto/${produto.product_id}`} className="font-semibold text-lg text-gray-900 hover:underline">
                        {produto.product_name}
                      </Link>
                      <div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                          {produto.category}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => alternarFavorito(produto.product_id, produto.product_name)}
                      style={{ color: favorito ? 'var(--danger)' : '#c7c9c2' }}
                      title={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    >
                      <Heart size={20} fill={favorito ? 'currentColor' : 'none'} />
                    </button>
                  </div>
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
            );
          })}

          {jaBuscou && resultados.length === 0 && (
            <EmptyState
              icon={Search}
              titulo="Nenhum produto encontrado"
              descricao="Tente outro termo de busca ou escolha outra categoria."
            />
          )}
        </div>
      )}
    </main>
  );
}