// app/admin/page.tsx
// Cadastro (Admin): adicionar mercado (com foto e coordenadas), adicionar produto (com foto),
// e atualizar preço (gera histórico).

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Store, Package, Loader2, TrendingUp, ImagePlus } from 'lucide-react';
import { useToast } from '@/components/Toast';

const inputClasse =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2';

async function uploadImagem(file: File, pasta: string): Promise<string | null> {
  const nomeArquivo = `${pasta}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  const { error } = await supabase.storage.from('imagens').upload(nomeArquivo, file);
  if (error) return null;
  const { data } = supabase.storage.from('imagens').getPublicUrl(nomeArquivo);
  return data.publicUrl;
}

export default function Admin() {
  const toast = useToast();

  const [nomeMercado, setNomeMercado] = useState('');
  const [enderecoMercado, setEnderecoMercado] = useState('');
  const [lng, setLng] = useState('-39.35');
  const [lat, setLat] = useState('-11.75');
  const [fotoMercado, setFotoMercado] = useState<File | null>(null);
  const [salvandoMercado, setSalvandoMercado] = useState(false);

  const [nomeProduto, setNomeProduto] = useState('');
  const [categoria, setCategoria] = useState('Mercearia');
  const [precoInicial, setPrecoInicial] = useState('');
  const [mercadoDoPreco, setMercadoDoPreco] = useState('');
  const [fotoProduto, setFotoProduto] = useState<File | null>(null);
  const [mercados, setMercados] = useState<{ id: string; nome: string }[]>([]);
  const [salvandoProduto, setSalvandoProduto] = useState(false);

  const [produtoParaAtualizar, setProdutoParaAtualizar] = useState('');
  const [mercadoParaAtualizar, setMercadoParaAtualizar] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  const [listaProdutos, setListaProdutos] = useState<any[]>([]);

  async function carregarMercados() {
    const { data } = await supabase.from('supermarkets').select('id, name, trade_name');
    setMercados((data || []).map((m) => ({ id: m.id, nome: m.trade_name || m.name })));
  }

  async function carregarProdutos() {
    const { data } = await supabase.from('products').select('id, name, category');
    setListaProdutos(data || []);
  }

  useEffect(() => {
    carregarMercados();
    carregarProdutos();
  }, []);

  async function salvarMercado() {
    if (!nomeMercado || !enderecoMercado) {
      toast.erro('Preencha nome e endereço.');
      return;
    }
    setSalvandoMercado(true);

    let imageUrl: string | null = null;
    if (fotoMercado) {
      imageUrl = await uploadImagem(fotoMercado, 'mercados');
      if (!imageUrl) toast.erro('A foto não pôde ser enviada, mas o mercado será salvo sem ela.');
    }

    const { error } = await supabase.from('supermarkets').insert({
      name: nomeMercado,
      trade_name: nomeMercado,
      address: enderecoMercado,
      location: `POINT(${lng} ${lat})`,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      verified: true,
      image_url: imageUrl,
    });
    setSalvandoMercado(false);
    if (error) {
      toast.erro('Erro ao salvar: ' + error.message);
    } else {
      toast.sucesso('Mercado salvo com sucesso!');
      setNomeMercado('');
      setEnderecoMercado('');
      setFotoMercado(null);
      carregarMercados();
    }
  }

  async function salvarProduto() {
    if (!nomeProduto || !precoInicial || !mercadoDoPreco) {
      toast.erro('Preencha produto, preço e escolha o mercado.');
      return;
    }
    setSalvandoProduto(true);

    let imageUrl: string | null = null;
    if (fotoProduto) {
      imageUrl = await uploadImagem(fotoProduto, 'produtos');
      if (!imageUrl) toast.erro('A foto não pôde ser enviada, mas o produto será salvo sem ela.');
    }

    const eanFake = Date.now().toString().slice(-13);

    const { data: produtoCriado, error: erroProduto } = await supabase
      .from('products')
      .insert({ ean_code: eanFake, name: nomeProduto, category: categoria, unit: 'un', image_url: imageUrl })
      .select()
      .single();

    if (erroProduto) {
      setSalvandoProduto(false);
      toast.erro('Erro ao salvar produto: ' + erroProduto.message);
      return;
    }

    const { error: erroPreco } = await supabase.from('product_prices').insert({
      product_id: produtoCriado.id,
      supermarket_id: mercadoDoPreco,
      price: parseFloat(precoInicial),
      source_type: 'admin',
    });

    if (!erroPreco) {
      await supabase.from('price_history').insert({
        product_id: produtoCriado.id,
        supermarket_id: mercadoDoPreco,
        price: parseFloat(precoInicial),
      });
    }

    setSalvandoProduto(false);
    if (erroPreco) {
      toast.erro('Produto salvo, mas erro ao salvar preço: ' + erroPreco.message);
    } else {
      toast.sucesso('Produto e preço salvos com sucesso!');
      setNomeProduto('');
      setPrecoInicial('');
      setFotoProduto(null);
      carregarProdutos();
    }
  }

  async function atualizarPreco() {
    if (!produtoParaAtualizar || !mercadoParaAtualizar || !novoPreco) {
      toast.erro('Selecione o produto, o mercado e informe o novo preço.');
      return;
    }
    setAtualizando(true);
    const precoNum = parseFloat(novoPreco);

    const { error: erroUpsert } = await supabase
      .from('product_prices')
      .upsert(
        {
          product_id: produtoParaAtualizar,
          supermarket_id: mercadoParaAtualizar,
          price: precoNum,
          source_type: 'admin',
          updated_at: new Date().toISOString(), // força a data a virar "agora" mesmo sendo uma atualização
        },
        { onConflict: 'product_id,supermarket_id' }
      );

    if (erroUpsert) {
      setAtualizando(false);
      toast.erro('Erro ao atualizar preço: ' + erroUpsert.message);
      return;
    }

    await supabase.from('price_history').insert({
      product_id: produtoParaAtualizar,
      supermarket_id: mercadoParaAtualizar,
      price: precoNum,
    });

    setAtualizando(false);
    toast.sucesso('Preço atualizado! Isso já entra no histórico do produto.');
    setNovoPreco('');
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
        Painel interno
      </p>
      <h1 className="font-display font-bold text-2xl mb-6 flex items-center gap-2" style={{ color: 'var(--brand)' }}>
        <Settings size={26} /> Cadastro
      </h1>

      <section className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Store size={18} style={{ color: 'var(--brand)' }} /> Adicionar mercado
        </h2>
        <div className="space-y-3">
          <input type="text" placeholder="Nome do mercado" value={nomeMercado} onChange={(e) => setNomeMercado(e.target.value)} className={inputClasse} />
          <input type="text" placeholder="Endereço" value={enderecoMercado} onChange={(e) => setEnderecoMercado(e.target.value)} className={inputClasse} />
          <div className="flex gap-3">
            <input type="text" placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} className={inputClasse} />
            <input type="text" placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} className={inputClasse} />
          </div>
          <p className="text-xs text-gray-400 -mt-1">
            Dica: no Google Maps, clique com o botão direito no local exato do mercado — as coordenadas aparecem no menu, no formato "latitude, longitude".
          </p>
          <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-4 py-3 text-gray-500 cursor-pointer hover:bg-gray-50">
            <ImagePlus size={18} />
            {fotoMercado ? fotoMercado.name : 'Escolher foto do mercado (opcional)'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFotoMercado(e.target.files?.[0] || null)}
            />
          </label>
          <button onClick={salvarMercado} disabled={salvandoMercado} className="btn-primary px-6 py-3 flex items-center gap-2">
            {salvandoMercado ? <Loader2 size={18} className="animate-spin" /> : 'Salvar mercado'}
          </button>
        </div>
      </section>

      <section className="card p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package size={18} style={{ color: 'var(--brand)' }} /> Adicionar produto com preço
        </h2>
        <div className="space-y-3">
          <input type="text" placeholder="Nome do produto" value={nomeProduto} onChange={(e) => setNomeProduto(e.target.value)} className={inputClasse} />
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClasse}>
            <option>Mercearia</option>
            <option>Hortifruti</option>
            <option>Açougue</option>
            <option>Limpeza</option>
            <option>Higiene</option>
            <option>Laticínios</option>
          </select>
          <input type="number" step="0.01" placeholder="Preço" value={precoInicial} onChange={(e) => setPrecoInicial(e.target.value)} className={inputClasse} />
          <select value={mercadoDoPreco} onChange={(e) => setMercadoDoPreco(e.target.value)} onFocus={carregarMercados} className={inputClasse}>
            <option value="">Selecione o mercado...</option>
            {mercados.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-4 py-3 text-gray-500 cursor-pointer hover:bg-gray-50">
            <ImagePlus size={18} />
            {fotoProduto ? fotoProduto.name : 'Escolher foto do produto (opcional)'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFotoProduto(e.target.files?.[0] || null)}
            />
          </label>
          <button onClick={salvarProduto} disabled={salvandoProduto} className="btn-primary px-6 py-3 flex items-center gap-2">
            {salvandoProduto ? <Loader2 size={18} className="animate-spin" /> : 'Salvar produto'}
          </button>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp size={18} style={{ color: 'var(--brand)' }} /> Atualizar preço (gera histórico)
        </h2>
        <div className="space-y-3">
          <select value={produtoParaAtualizar} onChange={(e) => setProdutoParaAtualizar(e.target.value)} className={inputClasse}>
            <option value="">Selecione o produto...</option>
            {listaProdutos.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select value={mercadoParaAtualizar} onChange={(e) => setMercadoParaAtualizar(e.target.value)} onFocus={carregarMercados} className={inputClasse}>
            <option value="">Selecione o mercado...</option>
            {mercados.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
          <input type="number" step="0.01" placeholder="Novo preço" value={novoPreco} onChange={(e) => setNovoPreco(e.target.value)} className={inputClasse} />
          <button onClick={atualizarPreco} disabled={atualizando} className="btn-primary px-6 py-3 flex items-center gap-2">
            {atualizando ? <Loader2 size={18} className="animate-spin" /> : 'Atualizar preço'}
          </button>
        </div>
      </section>
    </main>
  );
}