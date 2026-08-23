// components/EmptyState.tsx
// Estado vazio: mostrado quando uma busca ou lista não tem nenhum resultado.

import { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  titulo,
  descricao,
}: {
  icon: LucideIcon;
  titulo: string;
  descricao?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: '#eef2fb', color: 'var(--brand)' }}
      >
        <Icon size={26} />
      </div>
      <p className="font-semibold text-gray-900">{titulo}</p>
      {descricao && <p className="text-sm text-gray-500 mt-1 max-w-xs">{descricao}</p>}
    </div>
  );
}