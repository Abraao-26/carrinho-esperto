// app/api/nfce/route.ts

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ erro: 'Link do QR Code inválido.' }, { status: 400 });
    }

    // A SEFAZ-BA exige parâmetros específicos e cabeçalhos idênticos aos de um navegador mobile
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      cache: 'no-store',
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // Seletores específicos do layout da SEFAZ Bahia
    const mercado =
      $('#lblRazaoSocial').text().trim() ||
      $('.txtTopo').first().text().trim() ||
      'Mercado não identificado';

    const itens: { nome: string; preco: number }[] = [];

    // Iteração pelos itens da tabela
    $('#tabResult tr, .tblItens tr').each((_, el) => {
      const nome = $(el).find('.txtTit').text().trim();
      const valorTxt = $(el).find('.Rvl, .valor, td:last-child').text().trim();

      const match = valorTxt.match(/(\d{1,3}(\.\d{3})*,\d{2})/);

      if (nome && match) {
        const preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        if (!isNaN(preco)) {
          itens.push({ nome, preco });
        }
      }
    });

    if (itens.length === 0) {
      return NextResponse.json(
        { erro: 'A SEFAZ bloqueou o acesso automático nesta tentativa. Tente novamente em alguns instantes.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ mercado, itens });
  } catch (e) {
    return NextResponse.json(
      { erro: 'Não foi possível carregar os dados do portal da SEFAZ.' },
      { status: 500 }
    );
  }
}