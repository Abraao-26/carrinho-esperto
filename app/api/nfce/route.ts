// app/api/nfce/route.ts

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ erro: 'Link do QR Code inválido.' }, { status: 400 });
    }

    // Utiliza o proxy AllOrigins para contornar o bloqueio de IP da Vercel feito pela SEFAZ
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

    const resposta = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!resposta.ok) {
      throw new Error('Falha no proxy');
    }

    const data = await resposta.json();
    const html = data.contents;

    if (!html) {
      return NextResponse.json(
        { erro: 'A SEFAZ não retornou o conteúdo da página.' },
        { status: 502 }
      );
    }

    const $ = cheerio.load(html);

    // Extração do nome do estabelecimento
    const mercado = 
      $('.txtTopo').first().text().trim() || 
      $('#lblRazaoSocial').text().trim() ||
      'Mercado não identificado';

    const itens: { nome: string; preco: number }[] = [];

    // Mapeamento de linhas
    $('#tabResult tr, table tr').each((_, el) => {
      const nomeMatch = $(el).find('.txtTit, td:nth-child(1)').text().trim();
      const texto = $(el).text().replace(/\s+/g, ' ');
      const valorMatches = texto.match(/(\d{1,3}(\.\d{3})*,\d{2})/g);

      if (nomeMatch && valorMatches && valorMatches.length > 0) {
        const precoStr = valorMatches[valorMatches.length - 1];
        const preco = parseFloat(precoStr.replace(/\./g, '').replace(',', '.'));

        if (!isNaN(preco) && preco > 0) {
          itens.push({ nome: nomeMatch, preco });
        }
      }
    });

    if (itens.length === 0) {
      return NextResponse.json(
        { erro: 'Não foi possível ler os itens da nota. O portal da SEFAZ pode ter exibido um CAPTCHA.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ mercado, itens });
  } catch (e) {
    return NextResponse.json(
      { erro: 'Erro ao conectar com o serviço de consulta da SEFAZ.' },
      { status: 500 }
    );
  }
}