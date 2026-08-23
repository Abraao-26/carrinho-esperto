// components/MobileTabBar.tsx
// Barra de navegação fixa embaixo, estilo app de iPhone — agora com ícones
// Font Awesome, consistente com o resto do app.

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore, faSearch, faRoute, faHeart, faUser } from '@fortawesome/free-solid-svg-icons';

const abas = [
  { href: '/', label: 'Início', icone: faStore },
  { href: '/busca', label: 'Buscar', icone: faSearch },
  { href: '/carrinho', label: 'Carrinho', icone: faRoute },
  { href: '/favoritos', label: 'Favoritos', icone: faHeart },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const ultimaAba = user
    ? { href: '/conta', label: 'Perfil', icone: faUser }
    : { href: '/entrar', label: 'Entrar', icone: faUser };

  const todasAbas = [...abas, ultimaAba];

  return (
    <nav className="tab-bar fixed bottom-0 left-0 right-0 z-50 lg:hidden flex px-2 pt-1">
      {todasAbas.map(({ href, label, icone }) => {
        const ativo = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="tap-scale flex-1 flex flex-col items-center justify-center gap-0.5 py-2"
          >
            <div
              className="flex items-center justify-center rounded-full transition-all duration-300"
              style={{
                width: 44,
                height: 30,
                backgroundColor: ativo ? '#eef2fb' : 'transparent',
                transform: ativo ? 'translateY(-2px)' : 'translateY(0)',
              }}
            >
              <FontAwesomeIcon icon={icone} style={{ color: ativo ? 'var(--brand)' : '#9ca3af' }} size="lg" />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: ativo ? 'var(--brand)' : '#9ca3af' }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}