// app/api/nfce/route.ts
// Esta API roda no servidor (não no navegador), por isso consegue acessar
// o site da Sefaz sem ser bloqueada por CORS. Ela recebe o link do QR Code,
// busca a página da nota fiscal e extrai o nome do mercado e os itens comprados.

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ erro: 'Link do QR Code inválido.' }, { status: 400 });
    }

    // Busca a página HTML da nota fiscal no site da Sefaz
    const resposta = await fetch(url);
    const html = await resposta.text();
    const $ = cheerio.load(html);

    // ATENÇÃO: os seletores abaixo são um ponto de partida genérico.
    // Cada estado (Bahia, SP, etc.) organiza o HTML de um jeito um pouco diferente,
    // então vamos ajustar essas linhas quando testarmos com uma nota real.
    const mercado = $('.txtTopo').first().text().trim() || 'Mercado não identificado';

    const itens: { nome: string; preco: number }[] = [];
    $('#tabResult tr').each((_, linha) => {
      const nome = $(linha).find('.txtTit').text().trim();
      const precoTexto = $(linha).find('.valor').first().text().trim().replace(',', '.');
      const preco = parseFloat(precoTexto);

      if (nome && !isNaN(preco)) {
        itens.push({ nome, preco });
      }
    });

    if (itens.length === 0) {
      return NextResponse.json(
        { erro: 'Não consegui identificar os itens dessa nota. O formato do site pode ser diferente do esperado.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ mercado, itens });
  } catch (e) {
    return NextResponse.json({ erro: 'Erro ao acessar a nota fiscal.' }, { status: 500 });
  }
}