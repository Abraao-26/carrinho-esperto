// app/mercado/[id]/page.tsx
// Página pública do mercado: capa grande (banner de capa, separado da logo),
// estatísticas, galeria, busca e filtro de categoria dentro da loja.

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Store, MapPin, Package, Search, BadgeCheck, TrendingDown,
  CheckCircle2, Clock,
} from 'lucide-react';
import { SkeletonList } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';

type Mercado = {
  id: string;
  name: string;
  trade_name: string | null;
  address: string;
  image_url: string | null;
  cover_image_url: string | null;
  verified: boolean;
};

type FotoGaleria = { id: string; image_url: string };

type ProdutoDoMercado = {
  id: string;
  name: string;
  category: string;
  price: number;
  image_url: string | null;
  updated_at: string;
  menorPrecoGeral: number;
};

const CORES_AVATAR = ['#1a3d7c', '#00a86b', '#ff7a00', '#7c3aed', '#0891b2'];
function corDoMercado(nome: string) {
  const soma = nome.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CORES_AVATAR[soma % CORES_AVATAR.length];
}

export default function DetalheMercado() {
  const params = useParams();
  const id = params?.id as string;

  const [mercado, setMercado] = useState<Mercado | null>(null);
  const [galeria, setGaleria] = useState<FotoGaleria[]>([]);
  const [produtos, setProdutos] = useState<ProdutoDoMercado[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');

  useEffect(() => {
    if (!id) return;

    async function carregar() {
      setLoading(true);

      const { data: dadosMercado } = await supabase
        .from('supermarkets')
        .select('id, name, trade_name, address, image_url, cover_image_url, verified')
        .eq('id', id)
        .single();
      setMercado(dadosMercado);

      const { data: fotosGaleria } = await supabase
        .from('supermarket_images')
        .select('id, image_url')
        .eq('supermarket_id', id)
        .order('created_at', { ascending: true });
      setGaleria(fotosGaleria || []);

      const { data: precos } = await supabase
        .from('product_prices')
        .select('price, updated_at, products(id, name, category, image_url)')
        .eq('supermarket_id', id);

      const lista: ProdutoDoMercado[] = [];
      for (const p of precos || []) {
        const produto = (p as any).products;
        const { data: todosPrecos } = await supabase.from('product_prices').select('price').eq('product_id', produto.id);
        const menor = Math.min(...(todosPrecos || []).map((tp) => tp.price));

        lista.push({
          id: produto.id,
          name: produto.name,
          category: produto.category,
          price: p.price,
          image_url: produto.image_url,
          updated_at: p.updated_at,
          menorPrecoGeral: menor,
        });
      }
      setProdutos(lista);
      setLoading(false);
    }
    carregar();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen p-6 max-w-3xl mx-auto">
        <SkeletonList quantidade={4} />
      </main>
    );
  }

  if (!mercado) {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto">
        <EmptyState icon={Store} titulo="Mercado não encontrado" />
      </main>
    );
  }

  const nomeExibido = mercado.trade_name || mercado.name;
  const hojeStr = new Date().toDateString();
  const atualizadosHoje = produtos.filter((p) => new Date(p.updated_at).toDateString() === hojeStr).length;
  const maisBaratoEm = produtos.filter((p) => p.price === p.menorPrecoGeral).length;

  const categorias = ['Todos', ...Array.from(new Set(produtos.map((p) => p.category)))];

  const produtosFiltrados = produtos.filter((p) => {
    const bateBusca = p.name.toLowerCase().includes(busca.toLowerCase());
    const bateCategoria = categoriaAtiva === 'Todos' || p.category === categoriaAtiva;
    return bateBusca && bateCategoria;
  });

  return (
    <main className="min-h-screen pb-10">
      <div className="relative h-48 sm:h-56 overflow-hidden">
        {mercado.cover_image_url ? (
          <img src={mercado.cover_image_url} alt={nomeExibido} className="w-full h-full object-cover" />
        ) : mercado.image_url ? (
          <img src={mercado.image_url} alt={nomeExibido} className="w-full h-full object-cover blur-sm scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: corDoMercado(nomeExibido) }}>
            <Store size={56} className="text-white/40" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)' }} />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-14 relative">
        <div className="card p-6 mb-6">
          <div className="flex items-start gap-4">
            {mercado.image_url ? (
              <img src={mercado.image_url} alt={nomeExibido} className="w-16 h-16 rounded-2xl object-cover shrink-0 border-4 border-white -mt-12 shadow-md" />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-white font-display font-bold text-xl border-4 border-white -mt-12 shadow-md"
                style={{ backgroundColor: corDoMercado(nomeExibido) }}
              >
                {nomeExibido.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-bold text-xl text-gray-900">{nomeExibido}</h1>
                {mercado.verified && (
                  <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: '#e6f7f0', color: 'var(--success)' }}>
                    <BadgeCheck size={12} /> Verificado
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin size={13} /> {mercado.address}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Package size={14} style={{ color: 'var(--brand)' }} />
                <p className="font-display font-bold text-gray-900">{produtos.length}</p>
              </div>
              <p className="text-xs text-gray-500">Produtos</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown size={14} style={{ color: 'var(--success)' }} />
                <p className="font-display font-bold text-gray-900">{maisBaratoEm}</p>
              </div>
              <p className="text-xs text-gray-500">Mais barato em</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock size={14} style={{ color: 'var(--action)' }} />
                <p className="font-display font-bold text-gray-900">{atualizadosHoje}</p>
              </div>
              <p className="text-xs text-gray-500">Hoje</p>
            </div>
          </div>
        </div>

        {galeria.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 mb-6">
            {galeria.map((foto) => (
              <img key={foto.id} src={foto.image_url} alt="Foto do mercado" className="w-32 h-24 object-cover rounded-xl shrink-0" />
            ))}
          </div>
        )}

        {produtos.length > 0 && (
          <>
            <div className="relative mb-4">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Buscar em ${nomeExibido}...`}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full border border-gray-200 rounded-full pl-11 pr-4 py-3 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              />
            </div>

            {categorias.length > 1 && (
              <div className="pill-scroll mb-6">
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaAtiva(cat)}
                    className="tap-scale px-4 py-1.5 rounded-full text-sm font-medium transition-colors shrink-0"
                    style={{
                      backgroundColor: categoriaAtiva === cat ? 'var(--brand)' : 'white',
                      color: categoriaAtiva === cat ? 'white' : '#6b7280',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <h2 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
          <Package size={20} style={{ color: 'var(--brand)' }} />
          Produtos {produtosFiltrados.length !== produtos.length && `(${produtosFiltrados.length})`}
        </h2>

        {produtos.length === 0 && (
          <EmptyState icon={Package} titulo="Nenhum produto cadastrado ainda" descricao="Assim que produtos forem cadastrados para este mercado, eles aparecem aqui." />
        )}

        {produtos.length > 0 && produtosFiltrados.length === 0 && (
          <EmptyState icon={Search} titulo="Nenhum produto encontrado" descricao="Tente outro termo de busca ou categoria." />
        )}

        <div className="space-y-2">
          {produtosFiltrados.map((produto) => {
            const maisBarato = produto.price === produto.menorPrecoGeral;
            return (
              <Link key={produto.id} href={`/produto/${produto.id}`} className="card p-4 flex items-center gap-3 block">
                {produto.image_url ? (
                  <img src={produto.image_url} alt={produto.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#f7f8fa' }}>
                    <Package size={18} className="text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{produto.name}</p>
                  <p className="text-xs text-gray-400">{produto.category}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900">R$ {produto.price.toFixed(2)}</p>
                  {maisBarato && (
                    <span className="badge-economia">
                      <CheckCircle2 size={11} /> mais barato
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}