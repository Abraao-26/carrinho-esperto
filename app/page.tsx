// app/page.tsx
// Home (cliente): header com localização/busca/perfil, banner hero sem botões
// sobrepostos, grade de atalhos rápidos, categorias em bolhas (stories),
// vitrine de maiores quedas de preço, mercados próximos, e métricas + dica do
// dia movidas para o rodapé da página.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { calcularDistanciaKm } from '@/lib/geo';
import { getListas, excluirLista, type ListaSalva } from '@/lib/listas';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { SkeletonList } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { Store as StoreIconLucide } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMapMarkerAlt, faChevronDown, faUserCircle, faSearch, faBalanceScale,
  faRoute, faBarcode, faListCheck, faBasketShopping, faAppleWhole,
  faDrumstickBite, faSoap, faCheese, faBottleWater, faFire, faStore,
  faChevronLeft, faChevronRight, faLocationArrow, faSpinner, faTrash,
  faLightbulb, faBox, faBolt, faTrophy,
} from '@fortawesome/free-solid-svg-icons';

type Supermarket = {
  id: string;
  name: string;
  trade_name: string | null;
  address: string;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
};

type QuedaPreco = {
  product_id: string;
  product_name: string;
  image_url: string | null;
  supermarket_name: string;
  precoAntigo: number;
  precoNovo: number;
  percentual: number;
};

type SlideBanner = {
  id: string;
  tipo: 'institucional' | 'mercado';
  image_url: string | null;
  titulo: string;
  subtitulo?: string;
  supermarket_id?: string;
};

const CATEGORIAS_ATALHO = [
  { nome: 'Mercearia', icone: faBasketShopping, cor: '#1a3d7c', fundo: '#eef2fb' },
  { nome: 'Hortifruti', icone: faAppleWhole, cor: '#00a86b', fundo: '#e6f7f0' },
  { nome: 'Açougue', icone: faDrumstickBite, cor: '#e63946', fundo: '#fde8e9' },
  { nome: 'Limpeza', icone: faSoap, cor: '#7c3aed', fundo: '#f1eafd' },
  { nome: 'Laticínios', icone: faCheese, cor: '#ff7a00', fundo: '#fff1e6' },
  { nome: 'Bebidas', icone: faBottleWater, cor: '#0891b2', fundo: '#e0f7fa' },
];

const GRADIENTES_MERCADO = [
  'linear-gradient(135deg, #1a3d7c, #3a6fd8)',
  'linear-gradient(135deg, #00a86b, #34d399)',
  'linear-gradient(135deg, #ff7a00, #ffb347)',
  'linear-gradient(135deg, #7c3aed, #a78bfa)',
  'linear-gradient(135deg, #0891b2, #22d3ee)',
];
function gradienteDoMercado(nome: string) {
  const soma = nome.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return GRADIENTES_MERCADO[soma % GRADIENTES_MERCADO.length];
}
const CORES_AVATAR = ['#1a3d7c', '#00a86b', '#ff7a00', '#7c3aed', '#0891b2'];
function corDoMercado(nome: string) {
  const soma = nome.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CORES_AVATAR[soma % CORES_AVATAR.length];
}

const DICAS = [
  'Compare o preço por quilo ou litro, não só o preço da embalagem — às vezes a embalagem maior sai mais cara por unidade.',
  'Produtos de marca própria do mercado costumam ser 20-30% mais baratos que marcas famosas, com qualidade parecida.',
  'Feiras livres geralmente têm hortifruti mais barato que supermercado — vale comparar antes de fechar a lista.',
  'Evite fazer compras com fome: estudos mostram que isso aumenta o gasto em até 20%.',
  'Produtos perto da validade costumam ter desconto — ótimos para consumo imediato.',
  'Monte sua lista antes de sair de casa e use o Carrinho Inteligente para saber onde cada item sai mais barato.',
];
function dicaDoDia() {
  const dia = new Date().getDate();
  return DICAS[dia % DICAS.length];
}

const ATALHOS_RAPIDOS = [
  { label: 'Comparar Preço', icone: faBalanceScale, href: '/busca', cor: '#ff7a00' },
  { label: 'Rota Econômica', icone: faRoute, href: '/carrinho', cor: '#1a3d7c' },
  { label: 'Escanear Nota', icone: faBarcode, href: '/scanner', cor: '#00a86b' },
  { label: 'Minhas Listas', icone: faListCheck, href: '#minhas-listas', cor: '#7c3aed' },
];

export default function Home() {
  const toast = useToast();
  const router = useRouter();
  const { profile, user, loading: carregandoAuth } = useAuth();

  useEffect(() => {
    if (!carregandoAuth && profile?.tipo === 'empresa') {
      router.replace('/empresa');
    }
  }, [carregandoAuth, profile, router]);

  const [markets, setMarkets] = useState<Supermarket[]>([]);
  const [contagemProdutos, setContagemProdutos] = useState<Record<string, number>>({});
  const [maisBaratoPorMercado, setMaisBaratoPorMercado] = useState<Record<string, number>>({});
  const [economiaMedia, setEconomiaMedia] = useState<number | null>(null);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [totalAtualizacoesSemana, setTotalAtualizacoesSemana] = useState(0);
  const [quedasDePreco, setQuedasDePreco] = useState<QuedaPreco[]>([]);
  const [listasSalvas, setListasSalvas] = useState<ListaSalva[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [minhaLocalizacao, setMinhaLocalizacao] = useState<{ lat: number; lng: number } | null>(null);
  const [localizando, setLocalizando] = useState(false);

  const [slides, setSlides] = useState<SlideBanner[]>([]);
  const [slideAtual, setSlideAtual] = useState(0);
  const [buscaHeader, setBuscaHeader] = useState('');

  useEffect(() => {
    setListasSalvas(getListas());

    async function carregarDados() {
      setLoading(true);

      const [{ data: mercadosData, error }, { count: produtosCount }] = await Promise.all([
        supabase.from('supermarkets').select('id, name, trade_name, address, image_url, lat, lng'),
        supabase.from('products').select('id', { count: 'exact', head: true }),
      ]);
      if (error) setErro('Não foi possível carregar os mercados.');
      setMarkets(mercadosData || []);
      setTotalProdutos(produtosCount || 0);

      const { data: precos } = await supabase
        .from('product_prices')
        .select('product_id, supermarket_id, price, updated_at');

      if (precos) {
        const contagem: Record<string, number> = {};
        precos.forEach((p) => {
          contagem[p.supermarket_id] = (contagem[p.supermarket_id] || 0) + 1;
        });
        setContagemProdutos(contagem);

        const porProduto: Record<string, { price: number; supermarket_id: string }[]> = {};
        precos.forEach((p) => {
          if (!porProduto[p.product_id]) porProduto[p.product_id] = [];
          porProduto[p.product_id].push({ price: p.price, supermarket_id: p.supermarket_id });
        });

        const maisBarato: Record<string, number> = {};
        Object.values(porProduto).forEach((lista) => {
          const menor = Math.min(...lista.map((l) => l.price));
          lista.filter((l) => l.price === menor).forEach((l) => {
            maisBarato[l.supermarket_id] = (maisBarato[l.supermarket_id] || 0) + 1;
          });
        });
        setMaisBaratoPorMercado(maisBarato);

        const diferencas = Object.values(porProduto)
          .filter((lista) => lista.length > 1)
          .map((lista) => Math.max(...lista.map((l) => l.price)) - Math.min(...lista.map((l) => l.price)));
        if (diferencas.length > 0) {
          setEconomiaMedia(diferencas.reduce((a, b) => a + b, 0) / diferencas.length);
        }
      }

      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      const { count } = await supabase
        .from('price_history')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', seteDiasAtras.toISOString());
      setTotalAtualizacoesSemana(count || 0);

      const { data: historico } = await supabase
        .from('price_history')
        .select('product_id, supermarket_id, price, created_at, products(name, image_url), supermarkets(name, trade_name)')
        .order('created_at', { ascending: true });

      if (historico) {
        const grupos: Record<string, any[]> = {};
        historico.forEach((h: any) => {
          const chave = `${h.product_id}-${h.supermarket_id}`;
          if (!grupos[chave]) grupos[chave] = [];
          grupos[chave].push(h);
        });

        const quedas: QuedaPreco[] = [];
        Object.values(grupos).forEach((lista) => {
          if (lista.length < 2) return;
          const anterior = lista[lista.length - 2];
          const atual = lista[lista.length - 1];
          if (atual.price < anterior.price) {
            quedas.push({
              product_id: atual.product_id,
              product_name: atual.products.name,
              image_url: atual.products.image_url,
              supermarket_name: atual.supermarkets.trade_name || atual.supermarkets.name,
              precoAntigo: anterior.price,
              precoNovo: atual.price,
              percentual: ((anterior.price - atual.price) / anterior.price) * 100,
            });
          }
        });
        quedas.sort((a, b) => b.percentual - a.percentual);
        setQuedasDePreco(quedas.slice(0, 8));
      }

      const { data: bannersData } = await supabase
        .from('supermarket_banners')
        .select('id, image_url, titulo, supermarket_id, expires_at, supermarkets(name, trade_name)')
        .order('created_at', { ascending: false });

      const agora = new Date();
      const bannersValidos: SlideBanner[] = (bannersData || [])
        .filter((b: any) => !b.expires_at || new Date(b.expires_at) > agora)
        .map((b: any) => ({
          id: b.id,
          tipo: 'mercado' as const,
          image_url: b.image_url,
          titulo: b.titulo || 'Promoção',
          subtitulo: b.supermarkets?.trade_name || b.supermarkets?.name || '',
          supermarket_id: b.supermarket_id,
        }));

      const slideInstitucional: SlideBanner = {
        id: 'institucional',
        tipo: 'institucional',
        image_url: null,
        titulo: 'Ofertas da semana em Riachão do Jacuípe',
        subtitulo: 'Compare preços entre os mercados da cidade e economize em cada compra',
      };

      setSlides([slideInstitucional, ...bannersValidos]);
      setLoading(false);
    }
    carregarDados();
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setSlideAtual((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides]);

  function usarMinhaLocalizacao() {
    if (!navigator.geolocation) {
      toast.erro('Seu navegador não suporta localização.');
      return;
    }
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setMinhaLocalizacao({ lat: posicao.coords.latitude, lng: posicao.coords.longitude });
        setLocalizando(false);
        toast.sucesso('Localização encontrada! Mercados ordenados por distância.');
      },
      () => {
        setLocalizando(false);
        toast.erro('Não conseguimos acessar sua localização. Verifique a permissão do navegador.');
      }
    );
  }

  function buscarDoHeader(e: React.FormEvent) {
    e.preventDefault();
    if (buscaHeader.trim() === '') return;
    router.push(`/busca?q=${encodeURIComponent(buscaHeader)}`);
  }

  function abrirLista(lista: ListaSalva) {
    router.push(`/carrinho?lista=${lista.id}`);
  }

  function apagarLista(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Apagar esta lista salva?')) return;
    excluirLista(id);
    setListasSalvas(getListas());
    toast.sucesso('Lista apagada.');
  }

  const marketsComDistancia = markets.map((m) => {
    const distancia =
      minhaLocalizacao && m.lat != null && m.lng != null
        ? calcularDistanciaKm(minhaLocalizacao.lat, minhaLocalizacao.lng, m.lat, m.lng)
        : null;
    return { ...m, distancia };
  });

  const marketsOrdenados = minhaLocalizacao
    ? [...marketsComDistancia].sort((a, b) => (a.distancia ?? Infinity) - (b.distancia ?? Infinity))
    : marketsComDistancia;

  const idMercadoMaisBarato = Object.entries(maisBaratoPorMercado).sort((a, b) => b[1] - a[1])[0]?.[0];
  const idMercadoMaisProximo = minhaLocalizacao ? marketsOrdenados[0]?.id : null;

  if (carregandoAuth || profile?.tipo === 'empresa') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <FontAwesomeIcon icon={faSpinner} spin size="lg" className="text-gray-400" />
      </main>
    );
  }

  const slide = slides[slideAtual];

  return (
    <main className="min-h-screen">
      <div className="px-3 sm:px-6 max-w-6xl mx-auto pt-3">
        {/* ===== 1. Header: localização + busca + perfil ===== */}
        <div className="flex items-center justify-between mb-3">
          <button className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <FontAwesomeIcon icon={faMapMarkerAlt} style={{ color: 'var(--brand)' }} />
            Entregar em: <span className="font-semibold">Riachão do Jacuípe - BA</span>
            <FontAwesomeIcon icon={faChevronDown} className="text-gray-400" size="xs" />
          </button>
          <Link href={user ? '/conta' : '/entrar'} className="tap-scale text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={faUserCircle} size="xl" />
          </Link>
        </div>

        <form onSubmit={buscarDoHeader} className="relative mb-4">
          <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={buscaHeader}
            onChange={(e) => setBuscaHeader(e.target.value)}
            placeholder="Buscar produtos, marcas ou mercados..."
            className="w-full rounded-full pl-11 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            style={{ backgroundColor: '#f1f3f5' }}
          />
        </form>
      </div>

      {/* ===== 2. Banner hero, sem botões sobrepostos ===== */}
      {slide && (
        <div className="w-full px-3 sm:px-6 max-w-6xl mx-auto mb-6">
          <div
            className="banner-brilho relative rounded-2xl sm:rounded-3xl overflow-hidden text-white"
            style={{
              height: 'clamp(160px, 32vw, 260px)',
              background:
                slide.tipo === 'institucional'
                  ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 60%, #3a6fd8 100%)'
                  : '#111',
            }}
          >
            {slide.tipo === 'mercado' && slide.image_url && (
              <>
                <img src={slide.image_url} alt="" className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-50" />
                <img src={slide.image_url} alt={slide.titulo} className="absolute inset-0 w-full h-full object-contain" />
              </>
            )}
            <div className="absolute -right-10 -top-16 w-64 h-64 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute right-24 bottom-[-4rem] w-40 h-40 rounded-full bg-white/10 pointer-events-none" />

            <div
              className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent 55%)' }}
            >
              <p className="font-display text-lg sm:text-2xl font-extrabold mb-1 max-w-md leading-tight">{slide.titulo}</p>
              {slide.subtitulo && <p className="text-xs sm:text-sm opacity-90 max-w-md">{slide.subtitulo}</p>}
            </div>

            {slides.length > 1 && (
              <>
                <button
                  onClick={() => setSlideAtual((i) => (i - 1 + slides.length) % slides.length)}
                  className="tap-scale absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 flex items-center justify-center z-10"
                  aria-label="Anterior"
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <button
                  onClick={() => setSlideAtual((i) => (i + 1) % slides.length)}
                  className="tap-scale absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 flex items-center justify-center z-10"
                  aria-label="Próximo"
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                  {slides.map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all"
                      style={{
                        width: i === slideAtual ? 18 : 6,
                        height: 6,
                        backgroundColor: i === slideAtual ? 'white' : 'rgba(255,255,255,0.45)',
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="px-3 sm:px-6 max-w-6xl mx-auto pb-10">
        {/* ===== 3. Grade de atalhos rápidos ===== */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-9">
          {ATALHOS_RAPIDOS.map(({ label, icone, href, cor }) => (
            <Link key={label} href={href} className="tap-scale flex flex-col items-center gap-2 text-center">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white shadow-md"
                style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}
              >
                <FontAwesomeIcon icon={icone} size="lg" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-gray-700 leading-tight">{label}</span>
            </Link>
          ))}
        </div>

        {/* ===== 4. Categorias em bolhas (stories) ===== */}
        <h2 className="font-display font-bold text-lg mb-3">Categorias</h2>
        <div className="no-scrollbar flex gap-4 mb-9">
          {CATEGORIAS_ATALHO.map(({ nome, icone, cor, fundo }) => (
            <Link key={nome} href={`/busca?categoria=${encodeURIComponent(nome)}`} className="tap-scale flex flex-col items-center gap-2 shrink-0">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: fundo }}>
                <FontAwesomeIcon icon={icone} size="lg" style={{ color: cor }} />
              </div>
              <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{nome}</span>
            </Link>
          ))}
        </div>

        {/* ===== 5. Maior queda de preço hoje ===== */}
        {quedasDePreco.length > 0 && (
          <div className="mb-9">
            <h2 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faFire} style={{ color: 'var(--action)' }} />
              Maior queda de preço hoje
            </h2>
            <div className="no-scrollbar flex gap-4">
              {quedasDePreco.map((q, i) => (
                <Link key={i} href={`/produto/${q.product_id}`} className="card p-3 shrink-0" style={{ width: 160 }}>
                  <span
                    className="inline-block text-[10px] font-bold px-2 py-1 rounded-full mb-2"
                    style={{ backgroundColor: '#e6f7f0', color: 'var(--success)' }}
                  >
                    -{q.percentual.toFixed(0)}%
                  </span>
                  {q.image_url ? (
                    <img src={q.image_url} alt={q.product_name} className="w-full h-24 object-cover rounded-xl mb-2" />
                  ) : (
                    <div className="w-full h-24 rounded-xl mb-2 flex items-center justify-center" style={{ backgroundColor: '#f7f8fa' }}>
                      <FontAwesomeIcon icon={faBox} size="2x" className="text-gray-300" />
                    </div>
                  )}
                  <p className="font-medium text-gray-900 text-sm truncate">{q.product_name}</p>
                  <p className="text-xs text-gray-400 truncate mb-1">{q.supermarket_name}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs text-gray-400 line-through">R$ {q.precoAntigo.toFixed(2)}</span>
                  </div>
                  <span className="font-display font-extrabold text-lg" style={{ color: 'var(--success)' }}>
                    R$ {q.precoNovo.toFixed(2)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ===== 6. Mercados próximos ===== */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl flex items-center gap-2">
            <FontAwesomeIcon icon={faStore} style={{ color: 'var(--brand)' }} />
            Mercados próximos de você
          </h2>
          <button
            onClick={usarMinhaLocalizacao}
            disabled={localizando}
            className="tap-scale flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full shrink-0"
            style={{ backgroundColor: '#eef2fb', color: 'var(--brand)' }}
          >
            <FontAwesomeIcon icon={localizando ? faSpinner : faLocationArrow} spin={localizando} size="sm" />
            <span className="hidden sm:inline">{minhaLocalizacao ? 'Atualizar' : 'Usar localização'}</span>
          </button>
        </div>

        {loading && <SkeletonList />}
        {erro && <p style={{ color: 'var(--danger)' }}>{erro}</p>}

        {!loading && !erro && markets.length === 0 && (
          <EmptyState icon={StoreIconLucide} titulo="Nenhum mercado cadastrado ainda" descricao="Assim que os primeiros mercados forem cadastrados, eles aparecem aqui." />
        )}

        <div className="grid sm:grid-cols-2 gap-4 mb-9">
          {marketsOrdenados.map((mercado) => {
            const nomeExibido = mercado.trade_name || mercado.name;
            const qtdProdutos = contagemProdutos[mercado.id] || 0;
            const ehMaisBarato = mercado.id === idMercadoMaisBarato;
            const ehMaisProximo = mercado.id === idMercadoMaisProximo;

            return (
              <Link key={mercado.id} href={`/mercado/${mercado.id}`} className="card overflow-hidden p-0">
                <div className="h-24 relative">
                  {mercado.image_url ? (
                    <>
                      <img src={mercado.image_url} alt={nomeExibido} className="w-full h-full object-cover" />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent 60%)' }} />
                    </>
                  ) : (
                    <div className="w-full h-full relative overflow-hidden" style={{ background: gradienteDoMercado(nomeExibido) }}>
                      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/15" />
                      <div className="absolute right-10 bottom-[-2.5rem] w-16 h-16 rounded-full bg-white/10" />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent 60%)' }} />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    {ehMaisBarato && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-white shadow-sm" style={{ color: 'var(--success)' }}>
                        <FontAwesomeIcon icon={faTrophy} size="xs" /> Mais barato
                      </span>
                    )}
                    {ehMaisProximo && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-white shadow-sm" style={{ color: 'var(--brand)' }}>
                        <FontAwesomeIcon icon={faLocationArrow} size="xs" /> Mais próximo
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {mercado.image_url ? (
                      <img src={mercado.image_url} alt={nomeExibido} className="w-10 h-10 rounded-xl object-cover shrink-0 -mt-8 border-2 border-white shadow" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-display font-bold -mt-8 border-2 border-white shadow"
                        style={{ backgroundColor: corDoMercado(nomeExibido) }}
                      >
                        {nomeExibido.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{nomeExibido}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <FontAwesomeIcon icon={faMapMarkerAlt} size="xs" /> {mercado.address}
                      </p>
                    </div>
                    {mercado.distancia != null && (
                      <span className="text-xs font-bold shrink-0" style={{ color: 'var(--success)' }}>
                        {mercado.distancia < 1 ? `${Math.round(mercado.distancia * 1000)}m` : `${mercado.distancia.toFixed(1)}km`}
                      </span>
                    )}
                  </div>

                  {qtdProdutos > 0 && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                      {qtdProdutos} produto{qtdProdutos > 1 ? 's' : ''} cadastrado{qtdProdutos > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Minhas listas salvas */}
        {listasSalvas.length > 0 && (
          <div id="minhas-listas" className="mb-9 scroll-mt-24">
            <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faListCheck} style={{ color: 'var(--brand)' }} />
              Minhas listas salvas
            </h2>
            <div className="no-scrollbar flex gap-3">
              {listasSalvas.map((lista) => (
                <div
                  key={lista.id}
                  onClick={() => abrirLista(lista)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && abrirLista(lista)}
                  className="tap-scale card px-4 py-3 flex items-center gap-3 shrink-0 cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 text-left whitespace-nowrap">{lista.nome}</p>
                    <p className="text-xs text-gray-400 text-left">{lista.itens.length} itens</p>
                  </div>
                  <button onClick={(e) => apagarLista(lista.id, e)} className="text-gray-300 hover:text-red-500 shrink-0">
                    <FontAwesomeIcon icon={faTrash} size="sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 7. Rodapé informativo: métricas + dica do dia ===== */}
        <div className="border-t border-gray-100 pt-6 mt-6">
          <div className="no-scrollbar flex gap-3 mb-4">
            <div className="card px-4 py-2.5 flex items-center gap-2 shrink-0">
              <FontAwesomeIcon icon={faStore} size="sm" style={{ color: 'var(--brand)' }} />
              <div>
                <p className="font-display font-bold text-sm leading-none numero-destaque">{markets.length}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">mercados</p>
              </div>
            </div>
            <div className="card px-4 py-2.5 flex items-center gap-2 shrink-0">
              <FontAwesomeIcon icon={faBox} size="sm" style={{ color: 'var(--brand)' }} />
              <div>
                <p className="font-display font-bold text-sm leading-none numero-destaque">{totalProdutos}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">produtos</p>
              </div>
            </div>
            {economiaMedia !== null && economiaMedia > 0 && (
              <div className="card px-4 py-2.5 flex items-center gap-2 shrink-0">
                <FontAwesomeIcon icon={faFire} size="sm" style={{ color: 'var(--success)' }} />
                <div>
                  <p className="font-display font-bold text-sm leading-none numero-destaque">R$ {economiaMedia.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">economia média</p>
                </div>
              </div>
            )}
            {totalAtualizacoesSemana > 0 && (
              <div className="card px-4 py-2.5 flex items-center gap-2 shrink-0">
                <FontAwesomeIcon icon={faBolt} size="sm" style={{ color: 'var(--action)' }} />
                <div>
                  <p className="font-display font-bold text-sm leading-none numero-destaque">{totalAtualizacoesSemana}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">atualizações/semana</p>
                </div>
              </div>
            )}
          </div>

          <div className="card p-4 sm:p-5 flex items-start gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#fff1e6', color: 'var(--action)' }}>
              <FontAwesomeIcon icon={faLightbulb} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Dica de economia do dia</p>
              <p className="text-sm text-gray-700 leading-relaxed break-words">{dicaDoDia()}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}