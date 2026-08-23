// app/conta/page.tsx
// Minha Conta: editar nome, trocar senha, e excluir a conta.
// Funciona tanto para contas de Pessoa quanto de Empresa.

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Loader2, Lock, KeyRound, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/components/AuthProvider';

const inputClasse =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2';

export default function MinhaConta() {
  const router = useRouter();
  const toast = useToast();
  const { user, profile, loading: carregandoAuth, sair } = useAuth();

  const [nome, setNome] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);

  const [senhaNova, setSenhaNova] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (profile?.nome) setNome(profile.nome);
  }, [profile]);

  async function salvarNome() {
    if (!nome.trim() || !user) {
      toast.erro('Digite um nome válido.');
      return;
    }
    setSalvandoNome(true);
    const { error } = await supabase.from('profiles').update({ nome }).eq('id', user.id);
    setSalvandoNome(false);
    if (error) toast.erro('Erro ao salvar: ' + error.message);
    else toast.sucesso('Nome atualizado!');
  }

  async function trocarSenha() {
    if (senhaNova.length < 6) {
      toast.erro('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setSalvandoSenha(true);
    const { error } = await supabase.auth.updateUser({ password: senhaNova });
    setSalvandoSenha(false);
    if (error) toast.erro('Erro ao trocar senha: ' + error.message);
    else {
      toast.sucesso('Senha alterada com sucesso!');
      setSenhaNova('');
    }
  }

  async function excluirConta() {
    if (!user) return;
    setExcluindo(true);

    // Remove o perfil (isso já tira o acesso da pessoa às áreas de Pessoa/Empresa).
    // Observação: apagar o login por completo do sistema de autenticação exige uma
    // ação no servidor (fora do que o site consegue fazer sozinho); por enquanto,
    // isso desliga a conta e os dados de perfil — para remoção total, é só avisar.
    await supabase.from('profiles').delete().eq('id', user.id);
    await sair();

    setExcluindo(false);
    toast.sucesso('Conta removida. Sentiremos sua falta!');
    router.push('/');
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
        <p className="font-semibold text-gray-900 mb-1">Você precisa entrar para ver sua conta</p>
        <button onClick={() => router.push('/entrar')} className="btn-primary px-6 py-2.5 mt-3">
          Entrar
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
        {profile?.tipo === 'empresa' ? 'Conta de Empresa' : 'Conta de Pessoa'}
      </p>
      <h1 className="font-display font-bold text-2xl mb-6 flex items-center gap-2" style={{ color: 'var(--brand)' }}>
        <User size={26} /> Minha conta
      </h1>

      <section className="card p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">Dados pessoais</h2>
        <div className="space-y-3">
          <input type="text" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} className={inputClasse} />
          <input type="email" value={user.email} disabled className={inputClasse + ' bg-gray-50 text-gray-400'} />
          <p className="text-xs text-gray-400">O e-mail não pode ser alterado por aqui.</p>
          <button onClick={salvarNome} disabled={salvandoNome} className="btn-primary px-6 py-2.5 flex items-center gap-2">
            {salvandoNome ? <Loader2 size={16} className="animate-spin" /> : 'Salvar nome'}
          </button>
        </div>
      </section>

      <section className="card p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <KeyRound size={18} style={{ color: 'var(--brand)' }} /> Trocar senha
        </h2>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="Nova senha (mínimo 6 caracteres)"
            value={senhaNova}
            onChange={(e) => setSenhaNova(e.target.value)}
            className={inputClasse}
          />
          <button onClick={trocarSenha} disabled={salvandoSenha} className="btn-primary px-6 py-2.5 flex items-center gap-2">
            {salvandoSenha ? <Loader2 size={16} className="animate-spin" /> : 'Trocar senha'}
          </button>
        </div>
      </section>

      <section className="card p-6" style={{ borderColor: '#fde8e9' }}>
        <h2 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--danger)' }}>
          <AlertTriangle size={18} /> Excluir conta
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Isso remove seu perfil e acesso ao CarrinhoEsperto. Essa ação não pode ser desfeita.
        </p>

        {!confirmandoExclusao ? (
          <button
            onClick={() => setConfirmandoExclusao(true)}
            className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full"
            style={{ backgroundColor: '#fde8e9', color: 'var(--danger)' }}
          >
            <Trash2 size={16} /> Quero excluir minha conta
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={excluirConta}
              disabled={excluindo}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full text-white"
              style={{ backgroundColor: 'var(--danger)' }}
            >
              {excluindo ? <Loader2 size={16} className="animate-spin" /> : 'Sim, excluir de vez'}
            </button>
            <button
              onClick={() => setConfirmandoExclusao(false)}
              className="text-sm font-medium px-5 py-2.5 rounded-full bg-gray-100 text-gray-600"
            >
              Cancelar
            </button>
          </div>
        )}
      </section>
    </main>
  );
}