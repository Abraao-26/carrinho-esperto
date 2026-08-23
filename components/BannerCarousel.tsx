// components/BannerCarousel.tsx
// Mostra os banners de promoção ainda válidos (dentro do prazo escolhido pelo
// mercado), um de cada vez, trocando sozinho a cada 4 segundos.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Clock } from 'lucide-react';

type Banner = {
  id: string;
  image_url: string;
  titulo: string | null;
  supermarket_id: string;
  supermarket_name: string;
  expires_at: string | null;
};

function tempoRestante(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  if (dias > 0) return `Encerra em ${dias}d ${horas}h`;
  return `Encerra em ${horas}h`;
}

export default function BannerCarousel() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('supermarket_banners')
        .select('id, image_url, titulo, supermarket_id, expires_at, supermarkets(name, trade_name)')
        .order('created_at', { ascending: false });

      const agora = new Date();
      const validos = (data || []).filter((b: any) => !b.expires_at || new Date(b.expires_at) > agora);

      setBanners(
        validos.map((b: any) => ({
          id: b.id,
          image_url: b.image_url,
          titulo: b.titulo,
          supermarket_id: b.supermarket_id,
          expires_at: b.expires_at,
          supermarket_name: b.supermarkets?.trade_name || b.supermarkets?.name || '',
        }))
      );
    }
    carregar();
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => setIndice((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(timer);
  }, [banners]);

  if (banners.length === 0) return null;
  const banner = banners[indice];
  const restante = tempoRestante(banner.expires_at);

  return (
    <div
      onClick={() => router.push(`/mercado/${banner.supermarket_id}`)}
      className="relative rounded-3xl overflow-hidden mb-8 cursor-pointer card p-0"
      style={{ height: '160px' }}
    >
      <img src={banner.image_url} alt={banner.titulo || 'Promoção'} className="w-full h-full object-cover" />
      <div
        className="absolute inset-0 flex flex-col justify-end p-5"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent 60%)' }}
      >
        {banner.titulo && <p className="text-white font-display font-bold text-lg">{banner.titulo}</p>}
        <div className="flex items-center gap-3">
          <p className="text-white/80 text-xs">{banner.supermarket_name}</p>
          {restante && (
            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--action)', color: 'white' }}>
              <Clock size={10} /> {restante}
            </span>
          )}
        </div>
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {banners.map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: i === indice ? 'white' : 'rgba(255,255,255,0.4)' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}