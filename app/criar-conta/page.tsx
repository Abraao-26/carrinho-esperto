// app/criar-conta/page.tsx
// Tela de criação de conta. A pessoa escolhe se é "Pessoa" (cliente comum)
// ou "Empresa" (dono de mercado). Se for Empresa, já cadastra o mercado dela.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserPlus, Loader2, User, Store } from 'lucide-react';
import { useToast } from '@/components/Toast';
import Link from 'next/link';

export default function CriarConta() {
  const router = useRouter();
  const toast = useToast();

  const [tipo, setTipo] = useState<'cliente' | 'empresa'>('cliente');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  // Campos extras, só usados quando tipo === 'empresa'
  const [nomeMercado, setNomeMercado] = useState('');
  const [enderecoMercado, setEnderecoMercado] = useState('');

  const [carregando, setCarregando] = useState(false);

  async function criarConta() {
    if (!nome || !email || !senha) {
      toast.erro('Preencha nome, e-mail e senha.');
      return;
    }
    if (tipo === 'empresa' && (!nomeMercado || !enderecoMercado)) {
      toast.erro('Preencha o nome e o endereço do seu mercado.');
      return;
    }

    setCarregando(true);

    // 1. Cria a conta de login
    const { data: authData, error: erroAuth } = await supabase.auth.signUp({ email, password: senha });

    if (erroAuth || !authData.user) {
      setCarregando(false);
      toast.erro('Erro ao criar conta: ' + (erroAuth?.message || 'tente novamente.'));
      return;
    }

    let supermarketId: string | null = null;

    // 2. Se for Empresa, cria o mercado dela no banco
    if (tipo === 'empresa') {
      const { data: mercadoCriado, error: erroMercado } = await supabase
        .from('supermarkets')
        .insert({
          name: nomeMercado,
          trade_name: nomeMercado,
          address: enderecoMercado,
          location: 'POINT(-39.35 -11.75)', // coordenada aproximada da cidade; a empresa pode ajustar depois
          lat: -11.75,
          lng: -39.35,
          verified: false,
        })
        .select()
        .single();

      if (erroMercado) {
        setCarregando(false);
        toast.erro('Conta criada, mas houve erro ao cadastrar o mercado: ' + erroMercado.message);
        return;
      }
      supermarketId = mercadoCriado.id;
    }

    // 3. Cria o perfil, ligando a conta ao tipo (e ao mercado, se for empresa)
    const { error: erroPerfil } = await supabase.from('profiles').insert({
      id: authData.user.id,
      nome,
      tipo,
      supermarket_id: supermarketId,
    });

    setCarregando(false);

    if (erroPerfil) {
      toast.erro('Conta criada, mas houve erro ao salvar o perfil: ' + erroPerfil.message);
      return;
    }

    toast.sucesso('Conta criada com sucesso!');
    router.push('/');
  }

  return (
    <main className="min-h-screen p-6 max-w-sm mx-auto flex flex-col justify-center py-10">
      <div className="card p-8">
        <h1 className="font-display font-bold text-2xl mb-1 text-center" style={{ color: 'var(--brand)' }}>
          Criar conta
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">Escolha o tipo de conta</p>

        {/* Seletor Pessoa / Empresa */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => setTipo('cliente')}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-sm font-medium"
            style={{
              backgroundColor: tipo === 'cliente' ? 'var(--brand)' : '#f7f8fa',
              color: tipo === 'cliente' ? 'white' : '#6b7280',
            }}
          >
            <User size={18} /> Pessoa
          </button>
          <button
            onClick={() => setTipo('empresa')}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-sm font-medium"
            style={{
              backgroundColor: tipo === 'empresa' ? 'var(--brand)' : '#f7f8fa',
              color: tipo === 'empresa' ? 'white' : '#6b7280',
            }}
          >
            <Store size={18} /> Empresa
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder={tipo === 'empresa' ? 'Seu nome (responsável)' : 'Seu nome'}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2"
          />
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2"
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2"
          />

          {tipo === 'empresa' && (
            <>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-3 mb-2">
                  Dados do seu mercado
                </p>
              </div>
              <input
                type="text"
                placeholder="Nome do mercado"
                value={nomeMercado}
                onChange={(e) => setNomeMercado(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2"
              />
              <input
                type="text"
                placeholder="Endereço do mercado"
                value={enderecoMercado}
                onChange={(e) => setEnderecoMercado(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2"
              />
            </>
          )}

          <button onClick={criarConta} disabled={carregando} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            {carregando ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> Criar conta</>}
          </button>
        </div>

        <p className="text-sm text-gray-500 text-center mt-6">
          Já tem conta?{' '}
          <Link href="/entrar" className="font-semibold" style={{ color: 'var(--brand)' }}>
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}