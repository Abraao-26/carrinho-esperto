// app/entrar/page.tsx
// Tela de login: e-mail/senha (com botão de mostrar/ocultar senha), login
// de verdade com Google, botão da Apple ainda "em breve", e "Continuar
// como convidado".

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogIn, Loader2, ShoppingCart, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/Toast';
import Link from 'next/link';

export default function Entrar() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);

  async function entrar() {
    if (!email || !senha) {
      toast.erro('Preencha e-mail e senha.');
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);

    if (error) {
      toast.erro('E-mail ou senha incorretos: ' + error.message);
    } else {
      toast.sucesso('Login realizado!');
      router.push('/');
    }
  }

  async function entrarComGoogle() {
    setCarregandoGoogle(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      setCarregandoGoogle(false);
      toast.erro('Erro ao entrar com Google: ' + error.message);
    }
    // Se não der erro, o navegador é redirecionado para o Google — a página não continua daqui.
  }

  function loginApple() {
    toast.erro('Login com Apple em breve — por enquanto, use e-mail e senha ou Google.');
  }

  return (
    <main className="min-h-screen p-6 flex flex-col justify-center max-w-sm mx-auto">
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
          style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}
        >
          <ShoppingCart size={26} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-2xl text-gray-900">Bem-vindo de volta</h1>
        <p className="text-sm text-gray-500 mt-1 text-center">Entre para comparar preços e economizar</p>
      </div>

      <div className="card p-6">
        <div className="space-y-3 mb-5">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2"
          />
          <div className="relative">
            <input
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && entrar()}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button onClick={entrar} disabled={carregando} className="btn-primary tap-scale w-full py-3.5 flex items-center justify-center gap-2">
            {carregando ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> Entrar</>}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">ou continue com</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <div className="space-y-2.5 mb-5">
          <button
            onClick={entrarComGoogle}
            disabled={carregandoGoogle}
            className="tap-scale w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 font-medium text-sm text-gray-700 hover:bg-gray-50"
          >
            {carregandoGoogle ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.91c1.7-1.57 2.69-3.87 2.69-6.64z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.27c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.96 10.7c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V4.97H.96C.35 6.17 0 7.54 0 9s.35 2.83.96 4.03l3-2.33z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.97l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"/>
                </svg>
                Continuar com Google
              </>
            )}
          </button>
          <button
            onClick={loginApple}
            className="tap-scale w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-black text-white font-medium text-sm hover:bg-gray-900"
          >
            <svg width="16" height="16" viewBox="0 0 384 512" fill="white">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
            </svg>
            Continuar com Apple
          </button>
        </div>

        <button
          onClick={() => router.push('/')}
          className="tap-scale w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Continuar como convidado <ArrowRight size={14} />
        </button>
      </div>

      <p className="text-sm text-gray-500 text-center mt-6">
        Não tem conta?{' '}
        <Link href="/criar-conta" className="font-semibold" style={{ color: 'var(--brand)' }}>
          Criar conta
        </Link>
      </p>
    </main>
  );
}