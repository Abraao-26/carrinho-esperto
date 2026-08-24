// app/api/nfce/route.ts

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ erro: 'Link do QR Code inválido.' }, { status: 400 });
    }

    // Passamos headers de navegador real e configuramos para seguir redirecionamentos (redirect: 'follow')
    const resposta = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

    const html = await resposta.text();
    const $ = cheerio.load(html);

    // Nome do mercado: busca por várias classes comuns da SEFAZ
    const mercado =
      $('#txtTopo').text().trim() ||
      $('.txtTopo').first().text().trim() ||
      $('#comprovante .txtBox .txtTit').first().text().trim() ||
      'Mercado não identificado';

    const itens: { nome: string; preco: number }[] = [];

    // Busca linhas da tabela tanto no formato tradicional (#tabResult) quanto em estruturas alternativas
    const linhas = $('#tabResult tr').length > 0 ? $('#tabResult tr') : $('table tr');

    linhas.each((_, linha) => {
      // Tenta pegar o nome do produto
      const nome =
        $(linha).find('.txtTit').first().text().trim() ||
        $(linha).find('span[class*="txtTit"]').text().trim();

      // Captura o texto total da linha/colunas
      const textoLinha = $(linha).text();

      // Procura por valores monetários no formato brasileiro (ex: 11,99 ou 1.234,56)
      const matches = textoLinha.match(/(\d{1,3}(\.\d{3})*,\d{2})/g);

      if (nome && matches && matches.length > 0) {
        // Pega o último valor numérico encontrado na linha (normalmente o Vl. Total)
        const ultimoValor = matches[matches.length - 1];
        const preco = parseFloat(ultimoValor.replace(/\./g, '').replace(',', '.'));

        if (!isNaN(preco) && preco > 0) {
          // Evita duplicatas se a linha for um cabeçalho
          itens.push({ nome, preco });
        }
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