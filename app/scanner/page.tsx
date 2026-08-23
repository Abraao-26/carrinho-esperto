// app/scanner/page.tsx
// Scanner de nota fiscal, estilo marketplace.

'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, Receipt, AlertCircle } from 'lucide-react';

export default function Scanner() {
  const [lendo, setLendo] = useState(false);
  const [linkLido, setLinkLido] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  async function iniciarLeitura() {
    setErro(null);
    setLinkLido(null);
    setResultado(null);
    setLendo(true);

    const scanner = new Html5Qrcode('leitor-qrcode');
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        async (textoLido) => {
          await scanner.stop();
          setLendo(false);
          setLinkLido(textoLido);
          processarNota(textoLido);
        },
        () => {}
      );
    } catch (e) {
      setErro('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      setLendo(false);
    }
  }

  async function processarNota(url: string) {
    setProcessando(true);
    setErro(null);
    try {
      const resp = await fetch('/api/nfce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await resp.json();
      if (!resp.ok) setErro(data.erro || 'Erro ao processar a nota fiscal.');
      else setResultado(data);
    } catch (e) {
      setErro('Erro de conexão ao processar a nota.');
    } finally {
      setProcessando(false);
    }
  }

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  return (
    <main className="min-h-screen p-6 max-w-xl mx-auto">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
        NFC-e · Sefaz
      </p>
      <h1 className="font-display font-bold text-2xl mb-6 flex items-center gap-2" style={{ color: 'var(--brand)' }}>
        <ScanLine size={26} /> Ler nota fiscal
      </h1>

      {!lendo && !resultado && (
        <button onClick={iniciarLeitura} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          <ScanLine size={18} /> Abrir câmera e escanear
        </button>
      )}

      <div id="leitor-qrcode" className="mt-4 rounded-2xl overflow-hidden" />

      {linkLido && <p className="text-sm text-gray-400 mt-3 break-all">Link lido: {linkLido}</p>}
      {processando && <p className="text-gray-400 mt-3">Lendo os itens da nota fiscal...</p>}
      {erro && (
        <p className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--danger)' }}>
          <AlertCircle size={16} /> {erro}
        </p>
      )}

      {resultado && (
        <div className="card p-5 mt-4">
          <p className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
            <Receipt size={18} style={{ color: 'var(--brand)' }} /> {resultado.mercado}
          </p>
          <ul className="divide-y divide-gray-100">
            {resultado.itens.map((item: any, i: number) => (
              <li key={i} className="flex justify-between py-2">
                <span className="text-gray-700">{item.nome}</span>
                <span className="font-semibold text-gray-900">R$ {item.preco.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}