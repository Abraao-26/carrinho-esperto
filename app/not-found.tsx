// app/not-found.tsx
// Página exibida automaticamente pelo Next.js quando o usuário acessa um link que não existe.

import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
        style={{ backgroundColor: '#eef2fb', color: 'var(--brand)' }}
      >
        <SearchX size={30} />
      </div>
      <h1 className="font-display font-bold text-2xl text-gray-900 mb-2">Página não encontrada</h1>
      <p className="text-gray-500 mb-6 max-w-sm">
        O endereço que você tentou acessar não existe ou foi movido.
      </p>
      <Link href="/" className="btn-primary px-6 py-3">
        Voltar para o início
      </Link>
    </main>
  );
}