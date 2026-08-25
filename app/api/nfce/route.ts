// app/api/nfce/route.ts

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Cole aqui a API Key que você pegou no site da ScraperAPI
const SCRAPER_API_KEY = 'fb5300e3fef13e945f633a745052a6af';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ erro: 'Link do QR Code inválido.' }, { status: 400 });
    }

    // Monta a URL de requisição passando o link da SEFAZ para a ScraperAPI
    const scraperUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=true`;

    const response = await fetch(scraperUrl, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Falha ao obter dados via ScraperAPI');
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Captura o nome do mercado
    const mercado =
      $('#lblRazaoSocial').text().trim() ||
      $('.txtTopo').first().text().trim() ||
      'Mercado não identificado';

    const itens: { nome: string; preco: number }[] = [];

    // Extrai os produtos da tabela
    $('#tabResult tr, .tblItens tr, table tr').each((_, el) => {
      const nome = $(el).find('.txtTit, .nome').text().trim();
      const textoLinha = $(el).text();
      
      // Procura por padrão de valor R$ XX,XX
      const matches = textoLinha.match(/(\d{1,3}(\.\d{3})*,\d{2})/g);

      if (nome && matches && matches.length > 0) {
        const ultimoValor = matches[matches.length - 1];
        const preco = parseFloat(ultimoValor.replace(/\./g, '').replace(',', '.'));

        if (!isNaN(preco) && preco > 0) {
          itens.push({ nome, preco });
        }
      }
    });

    if (itens.length === 0) {
      return NextResponse.json(
        { erro: 'Não foi possível encontrar os produtos nesta nota fiscal.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ mercado, itens });
  } catch (e) {
    return NextResponse.json(
      { erro: 'Erro ao conectar com a SEFAZ através da API de captura.' },
      { status: 500 }
    );
  }
}