// components/Navbar.tsx
// Menu do site: se a conta for Empresa, mostra um menu de negócios totalmente
// diferente. Se for Pessoa ou visitante, mostra o menu normal — agora com
// ícones Font Awesome, no mesmo padrão visual da Home.

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCartShopping, faSearch, faRoute, faBarcode, faStore, faHeart,
  faBars, faXmark, faRightToBracket, faRightFromBracket, faBriefcase,
  faGaugeHigh, faArrowUpRightFromSquare, faUser,
} from '@fortawesome/free-solid-svg-icons';

const linksClienteBase = [
  { href: '/', label: 'Início', icone: faStore },
  { href: '/favoritos', label: 'Favoritos', icone: faHeart },
  { href: '/carrinho', label: 'Carrinho Inteligente', icone: faRoute },
  { href: '/scanner', label: 'Escanear nota', icone: faBarcode },
];

type Sugestao = { id: string; name: string; category: string };

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, sair } = useAuth();

  const [aberto, setAberto] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);

  const ehEmpresa = profile?.tipo === 'empresa';

  const linksCliente = user
    ? [...linksClienteBase, { href: '/conta', label: 'Minha conta', icone: faUser }]
    : linksClienteBase;

  const linksEmpresa = [
    { href: '/empresa', label: 'Painel', icone: faGaugeHigh },
    ...(profile?.supermarket_id
      ? [{ href: `/mercado/${profile.supermarket_id}`, label: 'Minha página pública', icone: faArrowUpRightFromSquare }]
      : []),
    { href: '/conta', label: 'Minha conta', icone: faUser },
  ];

  async function fazerLogout() {
    await sair();
    router.push('/');
  }

  useEffect(() => {
    if (ehEmpresa || termoBusca.trim().length < 2) {
      setSugestoes([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, category')
        .ilike('name', `%${termoBusca}%`)
        .limit(6);
      setSugestoes(data || []);
    }, 250);

    return () => clearTimeout(timer);
  }, [termoBusca, ehEmpresa]);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (caixaRef.current && !caixaRef.current.contains(e.target as Node)) {
        setMostrarSugestoes(false);
      }
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  function buscarGlobal(e: React.FormEvent) {
    e.preventDefault();
    if (termoBusca.trim() === '') return;
    setMostrarSugestoes(false);
    router.push(`/busca?q=${encodeURIComponent(termoBusca)}`);
    setAberto(false);
  }

  function escolherSugestao(nome: string) {
    setTermoBusca('');
    setMostrarSugestoes(false);
    setAberto(false);
    router.push(`/busca?q=${encodeURIComponent(nome)}`);
  }

  // ===== MENU DE EMPRESA =====
  if (ehEmpresa) {
    return (
      <nav className="sticky top-0 z-50 text-white glass-header" style={{ backgroundColor: 'var(--brand)', opacity: 0.97 }}>
        <div className="px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href="/empresa" className="flex items-center gap-2 font-display font-bold text-lg shrink-0">
            <FontAwesomeIcon icon={faBriefcase} />
            <span className="hidden sm:inline">Painel Empresa</span>
          </Link>

          <div className="hidden md:flex gap-1 ml-6">
            {linksEmpresa.map(({ href, label, icone }) => {
              const ativo = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors"
                  style={{ backgroundColor: ativo ? 'rgba(255,255,255,0.18)' : 'transparent' }}
                >
                  <FontAwesomeIcon icon={icone} size="sm" />
                  {label}
                </Link>
              );
            })}
          </div>

          <button
            onClick={fazerLogout}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium ml-auto hover:bg-white/10"
          >
            <FontAwesomeIcon icon={faRightFromBracket} size="sm" /> Sair
          </button>

          <button onClick={() => setAberto(!aberto)} className="md:hidden ml-auto">
            <FontAwesomeIcon icon={aberto ? faXmark : faBars} size="lg" />
          </button>
        </div>

        {aberto && (
          <div className="md:hidden px-4 pb-4 space-y-1 border-t border-white/10 pt-3">
            {linksEmpresa.map(({ href, label, icone }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setAberto(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10"
              >
                <FontAwesomeIcon icon={icone} size="sm" />
                {label}
              </Link>
            ))}
            <button
              onClick={fazerLogout}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium w-full hover:bg-white/10"
            >
              <FontAwesomeIcon icon={faRightFromBracket} size="sm" /> Sair
            </button>
          </div>
        )}
      </nav>
    );
  }

  // ===== MENU DE CLIENTE =====
  return (
    <nav className="sticky top-0 z-50 glass-header shadow-sm">
      <div className="px-4 sm:px-6 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-lg shrink-0" style={{ color: 'var(--brand)' }}>
          <FontAwesomeIcon icon={faCartShopping} />
          <span className="hidden sm:inline">CarrinhoEsperto</span>
        </Link>

        <div className="hidden sm:block flex-1 max-w-md relative" ref={caixaRef}>
          <form onSubmit={buscarGlobal} className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size="sm" />
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => {
                setTermoBusca(e.target.value);
                setMostrarSugestoes(true);
              }}
              onFocus={() => setMostrarSugestoes(true)}
              placeholder="Buscar produtos, marcas ou mercados..."
              className="w-full rounded-full pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
              style={{ backgroundColor: '#f1f3f5' }}
            />
          </form>

          {mostrarSugestoes && sugestoes.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-20">
              {sugestoes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => escolherSugestao(s.name)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-800 text-sm">{s.name}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">{s.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hidden lg:flex gap-1 ml-auto">
          {linksCliente.map(({ href, label, icone }) => {
            const ativo = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors"
                style={{
                  color: ativo ? 'var(--brand)' : '#6b7280',
                  backgroundColor: ativo ? '#eef2fb' : 'transparent',
                }}
              >
                <FontAwesomeIcon icon={icone} size="sm" />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {user ? (
            <button
              onClick={fazerLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={faRightFromBracket} size="sm" /> Sair
            </button>
          ) : (
            <Link
              href="/entrar"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <FontAwesomeIcon icon={faRightToBracket} size="sm" /> Entrar
            </Link>
          )}
        </div>

        <button onClick={() => setAberto(!aberto)} className="lg:hidden ml-auto text-gray-600">
          <FontAwesomeIcon icon={aberto ? faXmark : faBars} size="lg" />
        </button>
      </div>

      {aberto && (
        <div className="lg:hidden px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <div className="relative">
            <form onSubmit={buscarGlobal} className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size="sm" />
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => {
                  setTermoBusca(e.target.value);
                  setMostrarSugestoes(true);
                }}
                placeholder="Buscar produtos, marcas ou mercados..."
                className="w-full rounded-full pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                style={{ backgroundColor: '#f1f3f5' }}
              />
            </form>

            {mostrarSugestoes && sugestoes.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-20">
                {sugestoes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => escolherSugestao(s.name)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-800 text-sm">{s.name}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">{s.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {linksCliente.map(({ href, label, icone }) => {
              const ativo = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setAberto(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    color: ativo ? 'var(--brand)' : '#374151',
                    backgroundColor: ativo ? '#eef2fb' : 'transparent',
                  }}
                >
                  <FontAwesomeIcon icon={icone} size="sm" />
                  {label}
                </Link>
              );
            })}
          </div>

          {user ? (
            <button
              onClick={fazerLogout}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500"
            >
              <FontAwesomeIcon icon={faRightFromBracket} size="sm" /> Sair
            </button>
          ) : (
            <Link
              href="/entrar"
              onClick={() => setAberto(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500"
            >
              <FontAwesomeIcon icon={faRightToBracket} size="sm" /> Entrar
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}