// components/AppShell.tsx
// Envolve todo o site: menu de cima, barra inferior no celular (estilo iPhone),
// transição suave entre páginas, e Rodapé escondido para contas de Empresa.

'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageTransition from '@/components/PageTransition';
import MobileTabBar from '@/components/MobileTabBar';
import { useAuth } from '@/components/AuthProvider';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const ehEmpresa = profile?.tipo === 'empresa';

  return (
    <>
      <Navbar />
      <div className={ehEmpresa ? 'flex-1' : 'flex-1 mobile-tab-spacing'}>
        <PageTransition>{children}</PageTransition>
      </div>
      {!ehEmpresa && <Footer />}
      {!ehEmpresa && <MobileTabBar />}
    </>
  );
}