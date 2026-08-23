// components/PageTransition.tsx
// Aplica um fade suave sempre que a pessoa navega para uma página diferente.

'use client';

import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // A "key" mudar força o React a tratar como um elemento novo a cada troca de
  // página, o que reinicia a animação de entrada (page-transition) do zero.
  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}