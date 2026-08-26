// app/api/nfce/route.ts
// Lê a nota fiscal usando a ScraperAPI (navegador headless real), que contorna
// o bloqueio de Cloudflare/WAF que a Sefaz aplica a requisições de servidor.

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ erro: 'Link do QR Code inválido.' }, { status: 400 });
    }

    const apiKey = process.env.SCRAPER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ erro: 'Chave da ScraperAPI não configurada no servidor.' }, { status: 500 });
    }

    const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=true`;

    const response = await fetch(scraperUrl, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error('Falha ao obter dados via ScraperAPI');
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const mercado =
      $('#lblRazaoSocial').text().trim() ||
      $('.txtTopo').first().text().trim() ||
      'Mercado não identificado';

    const itens: { nome: string; preco: number }[] = [];

    $('#tabResult tr').each((_, el) => {
      const nome = $(el).find('.txtTit').first().text().trim();
      const textoLinha = $(el).text();
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
      { erro: 'Erro ao conectar com a Sefaz através da API de captura.' },
      { status: 500 }
    );
  }
}