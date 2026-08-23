// components/Footer.tsx
// Rodapé simples, presente em todas as páginas.

import { ShoppingCart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 mt-16 py-8 px-6 text-center">
      <div className="flex items-center justify-center gap-2 font-display font-bold" style={{ color: 'var(--brand)' }}>
        <ShoppingCart size={18} />
        CarrinhoEsperto
      </div>
      <p className="text-sm text-gray-400 mt-2">
        Feito com carinho para Riachão do Jacuípe, Bahia.
      </p>
    </footer>
  );
}