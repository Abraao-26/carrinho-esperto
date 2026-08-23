// components/Toast.tsx
// Sistema de notificações flutuantes. Qualquer tela pode chamar toast.sucesso(...) ou toast.erro(...).

'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type ToastItem = { id: number; tipo: 'sucesso' | 'erro'; mensagem: string };
type ToastContextType = {
  sucesso: (msg: string) => void;
  erro: (msg: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([]);

  const adicionar = useCallback((tipo: 'sucesso' | 'erro', mensagem: string) => {
    const id = Date.now();
    setItens((atual) => [...atual, { id, tipo, mensagem }]);
    // Some sozinho depois de 4 segundos
    setTimeout(() => {
      setItens((atual) => atual.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const valor: ToastContextType = {
    sucesso: (msg) => adicionar('sucesso', msg),
    erro: (msg) => adicionar('erro', msg),
  };

  return (
    <ToastContext.Provider value={valor}>
      {children}
      {/* Pilha de notificações no canto inferior direito */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
        {itens.map((item) => (
          <div
            key={item.id}
            className="toast-item flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium"
            style={{ backgroundColor: item.tipo === 'sucesso' ? 'var(--success)' : 'var(--danger)' }}
          >
            {item.tipo === 'sucesso' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {item.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}