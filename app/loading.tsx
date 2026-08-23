// app/loading.tsx
// O Next.js mostra esse componente automaticamente enquanto uma página está carregando,
// em qualquer lugar do site — sem precisar chamar nada manualmente.

import { SkeletonList } from '@/components/Skeleton';

export default function Loading() {
  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-6" />
      <SkeletonList quantidade={4} />
    </main>
  );
}