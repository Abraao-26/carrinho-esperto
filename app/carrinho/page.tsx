// app/carrinho/page.tsx
// Carrinho Inteligente: monte uma lista, veja onde é mais barato, compartilhe
// no WhatsApp, e agora também salve a lista com um nome para usar depois
// (aparece na Home em "Minhas listas salvas").

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Route, X, Lightbulb, Loader2, ShoppingBag, Share2, Save, Bookmark } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { EmptyState } from '@/components/EmptyState';
import { salvarLista, getListaPorId } from '@/lib/listas';

type ItemCarrinho = {
  product_id: string;
  product_name: string;
  precos: { supermarket_id: string; supermarket_name: string; price: number }[];
};

export default function Carrinho() {
  const searchParams = useSearchParams();
  const [termo, setTermo] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [adicionando, setAdicionando] = useState(false);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [nomeListaAtual, setNomeListaAtual] = useState<string | null>(null);

  const [mostrarSalvar, setMostrarSalvar] = useState(false);
  const [nomeParaSalvar, setNomeParaSalvar] = useState('');
  const toast = useToast();

  // Busca um produto pelo nome e monta o objeto completo (com preços) a partir do id
  async function buscarProdutoCompleto(productId: string): Promise<ItemCarrinho | null> {
    const { data: produto } = await supabase.from('products').select('id, name').eq('id', productId).single();
    if (!produto) return null;

    const { data: precos } = await supabase
      .from('product_prices')
      .select('price, supermarket_id, supermarkets(name, trade_name)')
      .eq('product_id', produto.id);

    return {
      product_id: produto.id,
      product_name: produto.name,
      precos: (precos || []).map((p: any) => ({
        supermarket_id: p.supermarket_id,
        supermarket_name: p.supermarkets.trade_name || p.supermarkets.name,
        price: p.price,
      })),
    };
  }

  // Se a URL trouxer ?lista=ID (vindo da Home), carrega os produtos daquela lista salva
  useEffect(() => {
    const listaId = searchParams.get('lista');
    if (!listaId) return;

    const lista = getListaPorId(listaId);
    if (!lista) {
      toast.erro('Essa lista salva não foi encontrada.');
      return;
    }

    async function carregar() {
      setCarregandoLista(true);
      const itens: ItemCarrinho[] = [];
      for (const item of lista!.itens) {
        const completo = await buscarProdutoCompleto(item.product_id);
        if (completo) itens.push(completo);
      }
      setCarrinho(itens);
      setNomeListaAtual(lista!.nome);
      setCarregandoLista(false);
      toast.sucesso(`Lista "${lista!.nome}" carregada!`);
    }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function adicionarProduto() {
    if (termo.trim() === '') return;
    setAdicionando(true);

    const { data: produtos, error: erroProdutos } = await supabase
      .from('products')
      .select('id, name')
      .ilike('name', `%${termo}%`)
      .limit(1);

    if (erroProdutos || !produtos || produtos.length === 0) {
      toast.erro('Produto não encontrado.');
      setAdicionando(false);
      return;
    }

    const produto = produtos[0];
    if (carrinho.some((item) => item.product_id === produto.id)) {
      toast.erro('Esse produto já está na lista.');
      setAdicionando(false);
      return;
    }

    const completo = await buscarProdutoCompleto(produto.id);
    if (completo) setCarrinho((atual) => [...atual, completo]);

    setTermo('');
    setAdicionando(false);
    toast.sucesso(`${produto.name} adicionado à lista!`);
  }

  function removerProduto(product_id: string) {
    setCarrinho((atual) => atual.filter((item) => item.product_id !== product_id));
  }

  function calcularCenarios() {
    const mercadosUnicos = new Map<string, string>();
    carrinho.forEach((item) =>
      item.precos.forEach((p) => mercadosUnicos.set(p.supermarket_id, p.supermarket_name))
    );

    const totalPorMercado = Array.from(mercadosUnicos.entries()).map(([id, nome]) => {
      const total = carrinho.reduce((soma, item) => {
        const preco = item.precos.find((p) => p.supermarket_id === id);
        return soma + (preco ? preco.price : 0);
      }, 0);
      return { id, nome, total };
    });

    const totalDividido = carrinho.reduce((soma, item) => {
      const menor = Math.min(...item.precos.map((p) => p.price));
      return soma + menor;
    }, 0);

    return { totalPorMercado, totalDividido };
  }

  const { totalPorMercado, totalDividido } = calcularCenarios();
  const melhorMercadoUnico = totalPorMercado.reduce(
    (melhor, atual) => (atual.total < melhor.total ? atual : melhor),
    totalPorMercado[0]
  );
  const economiaDividindo = melhorMercadoUnico ? melhorMercadoUnico.total - totalDividido : 0;

  function compartilharWhatsApp() {
    if (carrinho.length === 0) return;

    let texto = '🛒 *Minha lista de compras — CarrinhoEsperto*\n\n';
    carrinho.forEach((item) => {
      const menor = Math.min(...item.precos.map((p) => p.price));
      const mercadoMaisBarato = item.precos.find((p) => p.price === menor);
      texto += `• ${item.product_name} — R$ ${menor.toFixed(2)} (${mercadoMaisBarato?.supermarket_name})\n`;
    });
    texto += `\n💰 Total comprando no melhor preço de cada item: *R$ ${totalDividido.toFixed(2)}*`;
    if (melhorMercadoUnico) {
      texto += `\n🏪 Ou tudo em um só lugar (${melhorMercadoUnico.nome}): R$ ${melhorMercadoUnico.total.toFixed(2)}`;
    }

    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  }

  function confirmarSalvarLista() {
    if (!nomeParaSalvar.trim()) {
      toast.erro('Dê um nome para a lista (ex: Feira da semana).');
      return;
    }
    const itensParaSalvar = carrinho.map((item) => ({ product_id: item.product_id, product_name: item.product_name }));
    salvarLista(nomeParaSalvar.trim(), itensParaSalvar);
    toast.sucesso(`Lista "${nomeParaSalvar.trim()}" salva! Ela aparece na Home.`);
    setNomeListaAtual(nomeParaSalvar.trim());
    setNomeParaSalvar('');
    setMostrarSalvar(false);
  }

  if (carregandoLista) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
        {nomeListaAtual ? `Lista: ${nomeListaAtual}` : 'Monte sua lista'}
      </p>
      <h1 className="font-display font-bold text-2xl mb-5 flex items-center gap-2" style={{ color: 'var(--brand)' }}>
        <Route size={26} /> Carrinho Inteligente
      </h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionarProduto()}
          placeholder="Digite um produto e aperte Enter"
          className="flex-1 border border-gray-200 rounded-full px-5 py-3 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        />
        <button onClick={adicionarProduto} disabled={adicionando} className="btn-primary tap-scale px-6 flex items-center gap-2">
          {adicionando ? <Loader2 size={18} className="animate-spin" /> : 'Adicionar'}
        </button>
      </div>

      {carrinho.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          titulo="Sua lista está vazia"
          descricao="Digite produtos acima para começar a montar seu carrinho inteligente."
        />
      )}

      {carrinho.length > 0 && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Sua lista ({carrinho.length} itens)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setMostrarSalvar(!mostrarSalvar)}
                className="tap-scale flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full"
                style={{ backgroundColor: '#eef2fb', color: 'var(--brand)' }}
              >
                <Save size={14} /> Salvar lista
              </button>
              <button
                onClick={compartilharWhatsApp}
                className="tap-scale flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full"
                style={{ backgroundColor: '#e6f7f0', color: 'var(--success)' }}
              >
                <Share2 size={14} /> WhatsApp
              </button>
            </div>
          </div>

          {mostrarSalvar && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={nomeParaSalvar}
                onChange={(e) => setNomeParaSalvar(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmarSalvarLista()}
                placeholder="Nome da lista (ex: Feira da semana)"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2"
              />
              <button onClick={confirmarSalvarLista} className="btn-primary tap-scale px-4 py-2 flex items-center gap-1.5 text-sm">
                <Bookmark size={14} /> Salvar
              </button>
            </div>
          )}

          <ul className="divide-y divide-gray-100">
            {carrinho.map((item) => (
              <li key={item.product_id} className="flex justify-between items-center py-2">
                <span className="text-gray-800">{item.product_name}</span>
                <button onClick={() => removerProduto(item.product_id)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {carrinho.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Comparação de preços
          </p>

          {totalPorMercado.map((mercado) => {
            const melhor = mercado.id === melhorMercadoUnico?.id;
            return (
              <div
                key={mercado.id}
                className="flex justify-between items-center px-5 py-4 rounded-2xl"
                style={{
                  backgroundColor: melhor ? '#e6f7f0' : 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <span className="text-gray-700">Comprar tudo no {mercado.nome}</span>
                <span className="font-bold text-gray-900">R$ {mercado.total.toFixed(2)}</span>
              </div>
            );
          })}

          <div
            className="flex justify-between items-center px-5 py-4 rounded-2xl text-white"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}
          >
            <span>Dividindo entre os mercados</span>
            <span className="font-bold">R$ {totalDividido.toFixed(2)}</span>
          </div>

          <div className="flex gap-3 items-start p-4 rounded-2xl" style={{ backgroundColor: '#fff7ed' }}>
            <Lightbulb size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--action)' }} />
            {economiaDividindo > 0.01 ? (
              <p className="text-gray-700 text-sm">
                Dividindo a compra entre os mercados, você economiza{' '}
                <span className="font-bold" style={{ color: 'var(--success)' }}>
                  R$ {economiaDividindo.toFixed(2)}
                </span>{' '}
                em relação a comprar tudo em um só lugar.
              </p>
            ) : (
              <p className="text-gray-700 text-sm">
                Não há economia relevante em dividir — melhor comprar tudo no{' '}
                <span className="font-semibold">{melhorMercadoUnico?.nome}</span>.
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}