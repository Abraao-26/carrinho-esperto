// app/api/nfce/route.ts
// Lê a página pública da nota fiscal (NFC-e) e extrai o nome do mercado e os
// itens comprados. Testado com o layout real usado pela Sefaz-BA (tabela
// #tabResult, com cada produto em um <tr> e o nome em <span class="txtTit">).

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ erro: 'Link do QR Code inválido.' }, { status: 400 });
    }

    const resposta = await fetch(url);
    const html = await resposta.text();
    const $ = cheerio.load(html);

    // Nome do mercado: aparece destacado no topo da nota
    const mercado = $('.txtTopo').first().text().trim() || 'Mercado não identificado';

    const itens: { nome: string; preco: number }[] = [];

    // Cada produto é uma linha da tabela #tabResult
    $('#tabResult tr').each((_, linha) => {
      // O nome do produto é o primeiro span.txtTit da linha
      const nome = $(linha).find('.txtTit').first().text().trim();

      // O preço total fica na última coluna da linha, junto com o texto
      // "Vl. Total" (ex: "Vl. Total11,99"). Pegamos só o número do final.
      const textoUltimaColuna = $(linha).find('td').last().text();
      const match = textoUltimaColuna.match(/([\d.]+,\d{2})\s*$/);
      const preco = match ? parseFloat(match[1].replace(/\./g, '').replace(',', '.')) : NaN;

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