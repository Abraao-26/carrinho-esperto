// app/empresa/page.tsx
// Painel da Empresa: cabeçalho, abas (Visão geral, Produtos, Importar, Meu mercado).
// A aba "Meu mercado" gerencia: logo (foto pequena), banner de capa (grande),
// galeria de fotos e banner de promoção com duração.

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import {
  Briefcase, Package, Loader2, TrendingUp, Lock, LayoutDashboard,
  Store, Trophy, ImagePlus, MapPin, Trash2, Search, CheckCircle2,
  Upload, FileSpreadsheet, Download, AlertCircle, BadgeCheck,
  Clock, DollarSign, Images, X, LayoutTemplate,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/components/AuthProvider';
import { SkeletonList } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';

const inputClasse =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2';

async function uploadImagem(file: File, pasta: string): Promise<string | null> {
  const nomeArquivo = `${pasta}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  const { error } = await supabase.storage.from('imagens').upload(nomeArquivo, file);
  if (error) return null;
  const { data } = supabase.storage.from('imagens').getPublicUrl(nomeArquivo);
  return data.publicUrl;
}

function parsePrecoBR(valor: string): number | null {
  if (!valor) return null;
  const limpo = valor.toString().replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
  const numero = parseFloat(limpo);
  return isNaN(numero) ? null : numero;
}

const CORES_AVATAR = ['#1a3d7c', '#00a86b', '#ff7a00', '#7c3aed', '#0891b2'];
function corDoMercado(nome: string) {
  const soma = nome.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CORES_AVATAR[soma % CORES_AVATAR.length];
}

const DURACOES_BANNER = [
  { label: '3 dias', dias: 3 },
  { label: '7 dias', dias: 7 },
  { label: '15 dias', dias: 15 },
  { label: '30 dias', dias: 30 },
];

type Aba = 'visao' | 'produtos' | 'importar' | 'mercado';
type SugestaoProduto = { id: string; name: string; category: string };
type LinhaImportacao = { nome: string; preco: string; categoria?: string };
type ProdutoMercado = { id: string; name: string; category: string; price: number; updated_at?: string };
type FotoGaleria = { id: string; image_url: string };
type Banner = { id: string; image_url: string; titulo: string | null; expires_at: string | null };

function tempoRestanteLabel(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Expirado';
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  return dias > 0 ? `Encerra em ${dias}d ${horas}h` : `Encerra em ${horas}h`;
}

export default function PainelEmpresa() {
  const router = useRouter();
  const toast = useToast();
  const { user, profile, loading: carregandoAuth } = useAuth();
  const supermarketId = profile?.supermarket_id;

  const [aba, setAba] = useState<Aba>('visao');
  const [carregandoDados, setCarregandoDados] = useState(true);

  const [produtosDoMercado, setProdutosDoMercado] = useState<ProdutoMercado[]>([]);
  const [maisBaratoEm, setMaisBaratoEm] = useState(0);
  const [atualizadosHoje, setAtualizadosHoje] = useState(0);
  const [dadosMercado, setDadosMercado] = useState<{
    name: string;
    address: string;
    image_url: string | null;
    cover_image_url: string | null;
    verified: boolean;
  } | null>(null);
  const [galeria, setGaleria] = useState<FotoGaleria[]>([]);
  const [enviandoFotoGaleria, setEnviandoFotoGaleria] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [tituloBanner, setTituloBanner] = useState('');
  const [duracaoBanner, setDuracaoBanner] = useState(7);
  const [enviandoBanner, setEnviandoBanner] = useState(false);

  const [filtroProdutos, setFiltroProdutos] = useState('');

  const [nomeProduto, setNomeProduto] = useState('');
  const [categoria, setCategoria] = useState('Mercearia');
  const [preco, setPreco] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [produtoExistenteId, setProdutoExistenteId] = useState<string | null>(null);
  const [sugestoesProduto, setSugestoesProduto] = useState<SugestaoProduto[]>([]);
  const [mostrarSugestoesProduto, setMostrarSugestoesProduto] = useState(false);
  const caixaProdutoRef = useRef<HTMLDivElement>(null);

  const [produtoParaAtualizar, setProdutoParaAtualizar] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [atualizando, setAtualizando] = useState(false);

  const [novaLogo, setNovaLogo] = useState<File | null>(null);
  const [novaCapa, setNovaCapa] = useState<File | null>(null);
  const [salvandoMercado, setSalvandoMercado] = useState(false);

  const [linhasCSV, setLinhasCSV] = useState<LinhaImportacao[]>([]);
  const [nomeArquivoCSV, setNomeArquivoCSV] = useState('');
  const [processandoImportacao, setProcessandoImportacao] = useState(false);
  const [progressoImportacao, setProgressoImportacao] = useState(0);
  const [resultadoImportacao, setResultadoImportacao] = useState<{ criados: number; atualizados: number; erros: number } | null>(null);

  async function carregarTudo() {
    if (!supermarketId) return;
    setCarregandoDados(true);

    const [{ data: precos }, { data: mercado }, { data: fotos }, { data: bannersData }] = await Promise.all([
      supabase.from('product_prices').select('price, updated_at, products(id, name, category)').eq('supermarket_id', supermarketId),
      supabase.from('supermarkets').select('name, trade_name, address, image_url, cover_image_url, verified').eq('id', supermarketId).single(),
      supabase.from('supermarket_images').select('id, image_url').eq('supermarket_id', supermarketId).order('created_at', { ascending: true }),
      supabase.from('supermarket_banners').select('id, image_url, titulo, expires_at').eq('supermarket_id', supermarketId).order('created_at', { ascending: false }),
    ]);

    const lista: ProdutoMercado[] = (precos || []).map((p: any) => ({
      id: p.products.id,
      name: p.products.name,
      category: p.products.category,
      price: p.price,
      updated_at: p.updated_at,
    }));
    setProdutosDoMercado(lista);
    setGaleria(fotos || []);
    setBanners(bannersData || []);

    const hojeStr = new Date().toDateString();
    setAtualizadosHoje(lista.filter((p) => p.updated_at && new Date(p.updated_at).toDateString() === hojeStr).length);

    if (mercado) {
      setDadosMercado({
        name: mercado.trade_name || mercado.name,
        address: mercado.address,
        image_url: mercado.image_url,
        cover_image_url: mercado.cover_image_url,
        verified: mercado.verified,
      });
    }

    let contagem = 0;
    for (const item of lista) {
      const { data: todosPrecos } = await supabase.from('product_prices').select('price').eq('product_id', item.id);
      const menor = Math.min(...(todosPrecos || []).map((p) => p.price));
      if (item.price === menor) contagem++;
    }
    setMaisBaratoEm(contagem);

    setCarregandoDados(false);
  }

  useEffect(() => {
    if (supermarketId) carregarTudo();
  }, [supermarketId]);

  useEffect(() => {
    setProdutoExistenteId(null);
    if (nomeProduto.trim().length < 2) {
      setSugestoesProduto([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('products').select('id, name, category').ilike('name', `%${nomeProduto}%`).limit(5);
      setSugestoesProduto(data || []);
    }, 250);
    return () => clearTimeout(timer);
  }, [nomeProduto]);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (caixaProdutoRef.current && !caixaProdutoRef.current.contains(e.target as Node)) {
        setMostrarSugestoesProduto(false);
      }
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  function escolherProdutoExistente(s: SugestaoProduto) {
    setNomeProduto(s.name);
    setCategoria(s.category);
    setProdutoExistenteId(s.id);
    setMostrarSugestoesProduto(false);
  }

  async function salvarProduto() {
    if (!nomeProduto || !preco || !supermarketId) {
      toast.erro('Preencha o nome do produto e o preço.');
      return;
    }
    if (produtoExistenteId && produtosDoMercado.some((p) => p.id === produtoExistenteId)) {
      toast.erro('Esse produto já está no seu mercado. Use "Atualizar preço" para mudar o valor.');
      return;
    }

    setSalvando(true);
    let productId = produtoExistenteId;

    if (!productId) {
      const eanFake = Date.now().toString().slice(-13);
      const { data: produtoCriado, error: erroProduto } = await supabase
        .from('products')
        .insert({ ean_code: eanFake, name: nomeProduto, category: categoria, unit: 'un' })
        .select()
        .single();

      if (erroProduto) {
        setSalvando(false);
        toast.erro('Erro ao salvar produto: ' + erroProduto.message);
        return;
      }
      productId = produtoCriado.id;
    }

    const { error: erroPreco } = await supabase.from('product_prices').insert({
      product_id: productId,
      supermarket_id: supermarketId,
      price: parseFloat(preco),
      source_type: 'admin',
    });

    if (!erroPreco) {
      await supabase.from('price_history').insert({ product_id: productId, supermarket_id: supermarketId, price: parseFloat(preco) });
    }

    setSalvando(false);
    if (erroPreco) {
      toast.erro('Erro ao salvar preço: ' + erroPreco.message);
    } else {
      toast.sucesso(produtoExistenteId ? 'Produto do catálogo adicionado ao seu mercado!' : 'Novo produto criado e adicionado!');
      setNomeProduto('');
      setPreco('');
      setProdutoExistenteId(null);
      carregarTudo();
    }
  }

  async function atualizarPreco() {
    if (!produtoParaAtualizar || !novoPreco || !supermarketId) {
      toast.erro('Selecione o produto e informe o novo preço.');
      return;
    }
    setAtualizando(true);
    const precoNum = parseFloat(novoPreco);

    const { error } = await supabase
      .from('product_prices')
      .upsert(
        { product_id: produtoParaAtualizar, supermarket_id: supermarketId, price: precoNum, source_type: 'admin', updated_at: new Date().toISOString() },
        { onConflict: 'product_id,supermarket_id' }
      );

    if (!error) {
      await supabase.from('price_history').insert({ product_id: produtoParaAtualizar, supermarket_id: supermarketId, price: precoNum });
    }

    setAtualizando(false);
    if (error) {
      toast.erro('Erro ao atualizar: ' + error.message);
    } else {
      toast.sucesso('Preço atualizado!');
      setNovoPreco('');
      carregarTudo();
    }
  }

  async function removerProdutoDoMercado(productId: string, nome: string) {
    if (!supermarketId) return;
    if (!confirm(`Remover "${nome}" do seu mercado? Isso não apaga o produto de outros mercados.`)) return;

    const { error } = await supabase.from('product_prices').delete().eq('product_id', productId).eq('supermarket_id', supermarketId);
    if (error) toast.erro('Erro ao remover: ' + error.message);
    else {
      toast.sucesso('Produto removido do seu mercado.');
      carregarTudo();
    }
  }

  async function salvarDadosMercado() {
    if (!dadosMercado || !supermarketId) return;
    setSalvandoMercado(true);

    let imageUrl = dadosMercado.image_url;
    if (novaLogo) {
      const url = await uploadImagem(novaLogo, 'mercados');
      if (url) imageUrl = url;
      else toast.erro('A logo não pôde ser enviada, mas o resto foi salvo.');
    }

    let coverUrl = dadosMercado.cover_image_url;
    if (novaCapa) {
      const url = await uploadImagem(novaCapa, 'capas');
      if (url) coverUrl = url;
      else toast.erro('A capa não pôde ser enviada, mas o resto foi salvo.');
    }

    const { error } = await supabase
      .from('supermarkets')
      .update({
        name: dadosMercado.name,
        trade_name: dadosMercado.name,
        address: dadosMercado.address,
        image_url: imageUrl,
        cover_image_url: coverUrl,
      })
      .eq('id', supermarketId);

    setSalvandoMercado(false);
    if (error) {
      toast.erro('Erro ao salvar: ' + error.message);
    } else {
      toast.sucesso('Dados do mercado atualizados!');
      setNovaLogo(null);
      setNovaCapa(null);
      carregarTudo();
    }
  }

  async function adicionarFotoGaleria(file: File) {
    if (!supermarketId) return;
    setEnviandoFotoGaleria(true);

    const url = await uploadImagem(file, 'galeria');
    if (!url) {
      setEnviandoFotoGaleria(false);
      toast.erro('Não foi possível enviar essa foto.');
      return;
    }

    const { error } = await supabase.from('supermarket_images').insert({ supermarket_id: supermarketId, image_url: url });
    setEnviandoFotoGaleria(false);
    if (error) {
      toast.erro('Erro ao salvar a foto: ' + error.message);
    } else {
      toast.sucesso('Foto adicionada à galeria!');
      carregarTudo();
    }
  }

  async function removerFotoGaleria(fotoId: string) {
    if (!confirm('Remover esta foto da galeria?')) return;
    const { error } = await supabase.from('supermarket_images').delete().eq('id', fotoId);
    if (error) toast.erro('Erro ao remover: ' + error.message);
    else {
      toast.sucesso('Foto removida.');
      carregarTudo();
    }
  }

  async function adicionarBanner(file: File) {
    if (!supermarketId) return;
    setEnviandoBanner(true);

    const url = await uploadImagem(file, 'banners');
    if (!url) {
      setEnviandoBanner(false);
      toast.erro('Não foi possível enviar esse banner.');
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duracaoBanner);

    const { error } = await supabase.from('supermarket_banners').insert({
      supermarket_id: supermarketId,
      image_url: url,
      titulo: tituloBanner || null,
      expires_at: expiresAt.toISOString(),
    });

    setEnviandoBanner(false);
    if (error) {
      toast.erro('Erro ao salvar o banner: ' + error.message);
    } else {
      toast.sucesso(`Banner publicado por ${duracaoBanner} dias! Já aparece na Home para os clientes.`);
      setTituloBanner('');
      carregarTudo();
    }
  }

  async function removerBanner(bannerId: string) {
    if (!confirm('Remover este banner? Ele deixa de aparecer na Home.')) return;
    const { error } = await supabase.from('supermarket_banners').delete().eq('id', bannerId);
    if (error) toast.erro('Erro ao remover: ' + error.message);
    else {
      toast.sucesso('Banner removido.');
      carregarTudo();
    }
  }

  function baixarModelo() {
    const conteudo = 'produto;preco;categoria\nArroz Tipo 1 5kg;24,90;Mercearia\nFeijão Carioca 1kg;8,50;Mercearia\n';
    const blob = new Blob(['\uFEFF' + conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-carrinhoesperto.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function selecionarArquivo(file: File) {
    setNomeArquivoCSV(file.name);
    setResultadoImportacao(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: '',
      complete: (resultado: Papa.ParseResult<any>) => {
        const linhas: LinhaImportacao[] = (resultado.data as any[])
          .map((linha) => {
            const nome = linha.produto || linha.nome || linha.Produto || linha.Nome || linha.PRODUTO || '';
            const preco = linha.preco || linha.valor || linha.Preço || linha.Preco || linha.Valor || linha.PRECO || '';
            const cat = linha.categoria || linha.Categoria || linha.CATEGORIA || '';
            return { nome: String(nome).trim(), preco: String(preco).trim(), categoria: String(cat).trim() };
          })
          .filter((l) => l.nome && l.preco);

        setLinhasCSV(linhas);
        if (linhas.length === 0) {
          toast.erro('Não encontramos colunas de produto/preço nesse arquivo. Confira o modelo de exemplo.');
        }
      },
      error: () => toast.erro('Não foi possível ler esse arquivo. Confira se é um CSV válido.'),
    });
  }

  async function processarImportacao() {
    if (!supermarketId || linhasCSV.length === 0) return;
    setProcessandoImportacao(true);
    setProgressoImportacao(0);

    let criados = 0;
    let atualizados = 0;
    let erros = 0;

    for (let i = 0; i < linhasCSV.length; i++) {
      const linha = linhasCSV[i];
      const precoNum = parsePrecoBR(linha.preco);

      if (!linha.nome || precoNum === null) {
        erros++;
        setProgressoImportacao(i + 1);
        continue;
      }

      const { data: existentes } = await supabase.from('products').select('id').ilike('name', linha.nome).limit(1);
      let productId = existentes && existentes.length > 0 ? existentes[0].id : null;

      if (!productId) {
        const eanFake = `${Date.now()}${i}`.slice(-13);
        const { data: novoProduto, error: erroCriar } = await supabase
          .from('products')
          .insert({ ean_code: eanFake, name: linha.nome, category: linha.categoria || 'Mercearia', unit: 'un' })
          .select()
          .single();
        if (erroCriar || !novoProduto) {
          erros++;
          setProgressoImportacao(i + 1);
          continue;
        }
        productId = novoProduto.id;
        criados++;
      } else {
        atualizados++;
      }

      await supabase
        .from('product_prices')
        .upsert(
          { product_id: productId, supermarket_id: supermarketId, price: precoNum, source_type: 'admin', updated_at: new Date().toISOString() },
          { onConflict: 'product_id,supermarket_id' }
        );
      await supabase.from('price_history').insert({ product_id: productId, supermarket_id: supermarketId, price: precoNum });

      setProgressoImportacao(i + 1);
    }

    setProcessandoImportacao(false);
    setResultadoImportacao({ criados, atualizados, erros });
    setLinhasCSV([]);
    setNomeArquivoCSV('');
    toast.sucesso(`Importação concluída: ${criados} produtos novos, ${atualizados} atualizados.`);
    carregarTudo();
  }

  if (carregandoAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen p-6 max-w-sm mx-auto flex flex-col items-center justify-center text-center">
        <Lock size={32} className="text-gray-300 mb-3" />
        <p className="font-semibold text-gray-900 mb-1">Área exclusiva para empresas</p>
        <p className="text-sm text-gray-500 mb-4">Entre com sua conta de empresa para acessar o painel.</p>
        <button onClick={() => router.push('/entrar')} className="btn-primary px-6 py-2.5">
          Entrar
        </button>
      </main>
    );
  }

  if (profile?.tipo !== 'empresa') {
    return (
      <main className="min-h-screen p-6 max-w-sm mx-auto flex flex-col items-center justify-center text-center">
        <Lock size={32} className="text-gray-300 mb-3" />
        <p className="font-semibold text-gray-900 mb-1">Esta área é exclusiva para contas de Empresa</p>
        <p className="text-sm text-gray-500">Sua conta é do tipo Pessoa. Crie uma conta de Empresa para gerenciar um mercado.</p>
      </main>
    );
  }

  const ABAS: { id: Aba; label: string; icon: any }[] = [
    { id: 'visao', label: 'Visão geral', icon: LayoutDashboard },
    { id: 'produtos', label: 'Produtos', icon: Package },
    { id: 'importar', label: 'Importar', icon: Upload },
    { id: 'mercado', label: 'Meu mercado', icon: Store },
  ];

  const nomeExibido = dadosMercado?.name || 'Meu mercado';
  const produtosFiltrados = produtosDoMercado.filter((p) => p.name.toLowerCase().includes(filtroProdutos.toLowerCase()));

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Cabeçalho com capa + logo sobreposta */}
      <div className="card overflow-hidden mb-6 p-0">
        <div className="h-28 relative">
          {dadosMercado?.cover_image_url ? (
            <img src={dadosMercado.cover_image_url} alt="Capa" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }} />
          )}
        </div>
        <div className="p-5 pt-0">
          <div className="flex items-end gap-4 -mt-8 mb-3">
            {dadosMercado?.image_url ? (
              <img src={dadosMercado.image_url} alt={nomeExibido} className="w-16 h-16 rounded-2xl object-cover shrink-0 border-4 border-white shadow" />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-white font-display font-bold text-xl border-4 border-white shadow"
                style={{ backgroundColor: corDoMercado(nomeExibido) }}
              >
                {nomeExibido.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-bold text-xl text-gray-900">{nomeExibido}</h1>
            {dadosMercado?.verified ? (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: '#e6f7f0', color: 'var(--success)' }}>
                <BadgeCheck size={12} /> Verificado
              </span>
            ) : (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">Aguardando verificação</span>
            )}
          </div>
          {dadosMercado?.address && (
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <MapPin size={13} /> {dadosMercado.address}
            </p>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="pill-scroll mb-6">
        {ABAS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className="tap-scale flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors shrink-0"
            style={{ backgroundColor: aba === id ? 'var(--brand)' : '#f7f8fa', color: aba === id ? 'white' : '#6b7280' }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {carregandoDados ? (
        <SkeletonList quantidade={3} />
      ) : (
        <>
          {aba === 'visao' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="card p-4 text-center">
                  <Package size={18} className="mx-auto mb-2" style={{ color: 'var(--brand)' }} />
                  <p className="font-display font-bold text-lg text-gray-900">{produtosDoMercado.length}</p>
                  <p className="text-xs text-gray-500">Produtos</p>
                </div>
                <div className="card p-4 text-center">
                  <Trophy size={18} className="mx-auto mb-2" style={{ color: 'var(--success)' }} />
                  <p className="font-display font-bold text-lg text-gray-900">{maisBaratoEm}</p>
                  <p className="text-xs text-gray-500">Mais barato em</p>
                </div>
                <div className="card p-4 text-center">
                  <Clock size={18} className="mx-auto mb-2" style={{ color: 'var(--action)' }} />
                  <p className="font-display font-bold text-lg text-gray-900">{atualizadosHoje}</p>
                  <p className="text-xs text-gray-500">Hoje</p>
                </div>
                <div className="card p-4 text-center">
                  <DollarSign size={18} className="mx-auto mb-2" style={{ color: 'var(--brand)' }} />
                  <p className="font-display font-bold text-lg text-gray-900">
                    {produtosDoMercado.length > 0
                      ? `R$ ${(produtosDoMercado.reduce((s, p) => s + p.price, 0) / produtosDoMercado.length).toFixed(0)}`
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-500">Preço médio</p>
                </div>
              </div>

              <div className="card p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Seus produtos</h2>
                {produtosDoMercado.length === 0 ? (
                  <EmptyState icon={Package} titulo="Nenhum produto ainda" descricao='Use a aba "Produtos" acima para cadastrar o primeiro.' />
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {produtosDoMercado.slice(0, 8).map((p) => (
                      <li key={p.id} className="flex justify-between items-center py-3">
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-sm text-gray-500">{p.category}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">R$ {p.price.toFixed(2)}</span>
                          <button onClick={() => removerProdutoDoMercado(p.id, p.name)} className="text-gray-300 hover:text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                    {produtosDoMercado.length > 8 && (
                      <button onClick={() => setAba('produtos')} className="text-sm font-medium pt-3" style={{ color: 'var(--brand)' }}>
                        Ver todos os {produtosDoMercado.length} produtos →
                      </button>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}

          {aba === 'produtos' && (
            <div className="space-y-6">
              <section className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package size={18} style={{ color: 'var(--brand)' }} /> Adicionar produto
                </h2>
                <div className="space-y-3">
                  <div className="relative" ref={caixaProdutoRef}>
                    <div className="relative">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Digite o nome do produto"
                        value={nomeProduto}
                        onChange={(e) => {
                          setNomeProduto(e.target.value);
                          setMostrarSugestoesProduto(true);
                        }}
                        onFocus={() => setMostrarSugestoesProduto(true)}
                        className={inputClasse + ' pl-11'}
                      />
                    </div>

                    {mostrarSugestoesProduto && sugestoesProduto.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-20">
                        <p className="text-xs text-gray-400 px-4 pt-3 pb-1">Já existe no catálogo — clique para usar:</p>
                        {sugestoesProduto.map((s) => (
                          <button key={s.id} onClick={() => escolherProdutoExistente(s)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50">
                            <span className="text-gray-800 text-sm">{s.name}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">{s.category}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {produtoExistenteId && (
                      <p className="text-xs flex items-center gap-1 mt-1.5" style={{ color: 'var(--success)' }}>
                        <CheckCircle2 size={12} /> Usando produto já existente no catálogo (evita duplicar)
                      </p>
                    )}
                  </div>

                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClasse} disabled={!!produtoExistenteId}>
                    <option>Mercearia</option>
                    <option>Hortifruti</option>
                    <option>Açougue</option>
                    <option>Limpeza</option>
                    <option>Higiene</option>
                    <option>Laticínios</option>
                  </select>
                  <input type="number" step="0.01" placeholder="Preço" value={preco} onChange={(e) => setPreco(e.target.value)} className={inputClasse} />
                  <button onClick={salvarProduto} disabled={salvando} className="btn-primary tap-scale px-6 py-3 flex items-center gap-2">
                    {salvando ? <Loader2 size={18} className="animate-spin" /> : 'Salvar produto'}
                  </button>
                </div>
              </section>

              <section className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} style={{ color: 'var(--brand)' }} /> Atualizar preço
                </h2>
                <div className="space-y-3">
                  <select value={produtoParaAtualizar} onChange={(e) => setProdutoParaAtualizar(e.target.value)} className={inputClasse}>
                    <option value="">Selecione o produto...</option>
                    {produtosDoMercado.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input type="number" step="0.01" placeholder="Novo preço" value={novoPreco} onChange={(e) => setNovoPreco(e.target.value)} className={inputClasse} />
                  <button onClick={atualizarPreco} disabled={atualizando} className="btn-primary tap-scale px-6 py-3 flex items-center gap-2">
                    {atualizando ? <Loader2 size={18} className="animate-spin" /> : 'Atualizar preço'}
                  </button>
                </div>
              </section>

              <section className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">Todos os seus produtos ({produtosDoMercado.length})</h2>
                </div>
                <div className="relative mb-4">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filtrar seus produtos..."
                    value={filtroProdutos}
                    onChange={(e) => setFiltroProdutos(e.target.value)}
                    className={inputClasse + ' pl-11'}
                  />
                </div>
                {produtosFiltrados.length === 0 ? (
                  <p className="text-gray-400 text-sm py-2">Nenhum produto encontrado.</p>
                ) : (
                  <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {produtosFiltrados.map((p) => (
                      <li key={p.id} className="flex justify-between items-center py-3">
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-sm text-gray-500">{p.category}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">R$ {p.price.toFixed(2)}</span>
                          <button onClick={() => removerProdutoDoMercado(p.id, p.name)} className="text-gray-300 hover:text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {aba === 'importar' && (
            <div className="space-y-6">
              <section className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Upload size={18} style={{ color: 'var(--brand)' }} /> Importar do sistema de caixa
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Exporte a lista de produtos do seu sistema de caixa/ERP em <strong>CSV</strong> (geralmente em "Relatórios" ou
                  "Produtos &gt; Exportar") e suba o arquivo aqui. O arquivo precisa ter as colunas <strong>produto</strong> e{' '}
                  <strong>preço</strong> (categoria é opcional).
                </p>

                <button onClick={baixarModelo} className="flex items-center gap-1.5 text-sm font-medium mb-4" style={{ color: 'var(--brand)' }}>
                  <Download size={14} /> Baixar modelo de exemplo (.csv)
                </button>

                <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-4 py-4 text-gray-500 cursor-pointer hover:bg-gray-50 justify-center">
                  <FileSpreadsheet size={20} />
                  {nomeArquivoCSV || 'Clique para escolher o arquivo CSV'}
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && selecionarArquivo(e.target.files[0])} />
                </label>

                {linhasCSV.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">{linhasCSV.length} produtos encontrados. Prévia:</p>
                    <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
                      {linhasCSV.slice(0, 5).map((l, i) => (
                        <div key={i} className="flex justify-between px-4 py-2 text-sm border-b border-gray-100 last:border-0">
                          <span className="text-gray-700">{l.nome}</span>
                          <span className="text-gray-500">{l.preco}</span>
                        </div>
                      ))}
                      {linhasCSV.length > 5 && <p className="text-xs text-gray-400 px-4 py-2">e mais {linhasCSV.length - 5} produtos...</p>}
                    </div>

                    {processandoImportacao ? (
                      <div className="space-y-2">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${(progressoImportacao / linhasCSV.length) * 100}%`, backgroundColor: 'var(--brand)' }} />
                        </div>
                        <p className="text-xs text-gray-500 text-center">Processando {progressoImportacao} de {linhasCSV.length}...</p>
                      </div>
                    ) : (
                      <button onClick={processarImportacao} className="btn-primary tap-scale px-6 py-3 flex items-center gap-2">
                        <Upload size={18} /> Importar {linhasCSV.length} produtos
                      </button>
                    )}
                  </div>
                )}

                {resultadoImportacao && (
                  <div className="mt-4 p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: '#e6f7f0' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--success)' }} className="shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p><strong>{resultadoImportacao.criados}</strong> produtos novos criados</p>
                      <p><strong>{resultadoImportacao.atualizados}</strong> produtos já existentes atualizados</p>
                      {resultadoImportacao.erros > 0 && (
                        <p className="flex items-center gap-1 mt-1" style={{ color: 'var(--danger)' }}>
                          <AlertCircle size={14} /> {resultadoImportacao.erros} linhas com problema
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {aba === 'mercado' && dadosMercado && (
            <div className="space-y-6">
              <section className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Store size={18} style={{ color: 'var(--brand)' }} /> Dados do mercado
                </h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nome do mercado"
                    value={dadosMercado.name}
                    onChange={(e) => setDadosMercado({ ...dadosMercado, name: e.target.value })}
                    className={inputClasse}
                  />
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Endereço"
                      value={dadosMercado.address}
                      onChange={(e) => setDadosMercado({ ...dadosMercado, address: e.target.value })}
                      className={inputClasse + ' pl-11'}
                    />
                  </div>
                </div>
              </section>

              <section className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <ImagePlus size={18} style={{ color: 'var(--brand)' }} /> Logo do mercado
                </h2>
                <p className="text-sm text-gray-500 mb-4">A logo pequena, quadrada, que aparece nos cartões de mercado e no cabeçalho.</p>
                <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-4 py-3 text-gray-500 cursor-pointer hover:bg-gray-50">
                  <ImagePlus size={18} />
                  {novaLogo ? novaLogo.name : 'Trocar logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setNovaLogo(e.target.files?.[0] || null)} />
                </label>
              </section>

              <section className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <LayoutTemplate size={18} style={{ color: 'var(--brand)' }} /> Banner de capa
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  A imagem grande e retangular que fica no topo da página pública do seu mercado. Ideal: 1200x400px.
                </p>
                {dadosMercado.cover_image_url && (
                  <img src={dadosMercado.cover_image_url} alt="Capa atual" className="w-full h-28 object-cover rounded-xl mb-3" />
                )}
                <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-4 py-3 text-gray-500 cursor-pointer hover:bg-gray-50">
                  <ImagePlus size={18} />
                  {novaCapa ? novaCapa.name : 'Trocar banner de capa'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setNovaCapa(e.target.files?.[0] || null)} />
                </label>
              </section>

              <button onClick={salvarDadosMercado} disabled={salvandoMercado} className="btn-primary tap-scale w-full px-6 py-3.5 flex items-center justify-center gap-2">
                {salvandoMercado ? <Loader2 size={18} className="animate-spin" /> : 'Salvar todas as alterações'}
              </button>

              <section className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <Images size={18} style={{ color: 'var(--brand)' }} /> Galeria de fotos
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Fotos da fachada, dos corredores, de promoções — aparecem na sua página pública para dar mais confiança ao cliente.
                </p>

                {galeria.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                    {galeria.map((foto) => (
                      <div key={foto.id} className="relative group aspect-square">
                        <img src={foto.image_url} alt="Foto do mercado" className="w-full h-full object-cover rounded-xl" />
                        <button
                          onClick={() => removerFotoGaleria(foto.id)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-4 py-4 text-gray-500 cursor-pointer hover:bg-gray-50 justify-center">
                  {enviandoFotoGaleria ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                  {enviandoFotoGaleria ? 'Enviando...' : 'Adicionar foto à galeria'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={enviandoFotoGaleria}
                    onChange={(e) => e.target.files?.[0] && adicionarFotoGaleria(e.target.files[0])}
                  />
                </label>
              </section>

              <section className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <LayoutTemplate size={18} style={{ color: 'var(--brand)' }} /> Banner de promoção
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Aparece rotativo na tela inicial do site para todos os clientes, durante o tempo que você escolher.
                </p>

                {banners.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {banners.map((b) => (
                      <div key={b.id} className="relative rounded-xl overflow-hidden h-24">
                        <img src={b.image_url} alt={b.titulo || 'Banner'} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-end justify-between p-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)' }}>
                          <div>
                            {b.titulo && <p className="text-white text-sm font-semibold">{b.titulo}</p>}
                            <p className="text-white/80 text-xs">{tempoRestanteLabel(b.expires_at)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removerBanner(b.id)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Título da promoção (opcional, ex: Ofertas da semana!)"
                  value={tituloBanner}
                  onChange={(e) => setTituloBanner(e.target.value)}
                  className={inputClasse + ' mb-3'}
                />

                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Por quanto tempo fica no ar?</p>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {DURACOES_BANNER.map((d) => (
                    <button
                      key={d.dias}
                      onClick={() => setDuracaoBanner(d.dias)}
                      className="tap-scale px-4 py-2 rounded-full text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: duracaoBanner === d.dias ? 'var(--brand)' : '#f7f8fa',
                        color: duracaoBanner === d.dias ? 'white' : '#6b7280',
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-4 py-4 text-gray-500 cursor-pointer hover:bg-gray-50 justify-center">
                  {enviandoBanner ? <Loader2 size={18} className="animate-spin" /> : <LayoutTemplate size={18} />}
                  {enviandoBanner ? 'Enviando...' : `Publicar banner por ${duracaoBanner} dias`}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={enviandoBanner}
                    onChange={(e) => e.target.files?.[0] && adicionarBanner(e.target.files[0])}
                  />
                </label>
              </section>
            </div>
          )}
        </>
      )}
    </main>
  );
}