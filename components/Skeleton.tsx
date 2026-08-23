// components/Skeleton.tsx
// Barrinhas cinzas animadas exibidas enquanto os dados ainda estão carregando.

export function SkeletonCard() {
  return (
    <div className="card p-5 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  );
}

export function SkeletonList({ quantidade = 3 }: { quantidade?: number }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {Array.from({ length: quantidade }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}