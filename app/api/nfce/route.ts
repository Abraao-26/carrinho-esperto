// app/api/nfce/route.ts

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ erro: 'Link do QR Code inválido.' }, { status: 400 });
    }

    // Força HTTPS no link caso venha HTTP simples da SEFAZ
    const targetUrl = url.replace('http://', 'https://');

    const resposta = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });

    const html = await resposta.text();
    const $ = cheerio.load(html);

    // Extração do nome do estabelecimento
    const mercado = 
      $('.txtTopo').first().text().trim() || 
      $('#lblRazaoSocial').text().trim() ||
      'Mercado não identificado';

    const itens: { nome: string; preco: number }[] = [];

    // Mapeamento abrangente de tabelas e listas da SEFAZ
    $('tr, .linhaItem').each((_, el) => {
      const texto = $(el).text().replace(/\s+/g, ' ');
      
      // Procura nomes de produtos comuns
      const nomeMatch = $(el).find('.txtTit, .txtNome, td:nth-child(1)').text().trim();
      
      // Procura valores no formato moeda (R$ XX,XX ou XX,XX)
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
        { erro: 'O site da SEFAZ exigiu validação manual (CAPTCHA) ou alterou a estrutura. Recomenda-se integrar uma API de consulta NFC-e.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ mercado, itens });
  } catch (e) {
    return NextResponse.json({ erro: 'Falha na conexão com os servidores da SEFAZ.' }, { status: 500 });
  }
}