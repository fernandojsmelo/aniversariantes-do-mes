const fs = require('node:fs');
const JSZip = require('jszip');

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const LINHA_COLABORADOR = /^(.+?)\s+(\d{2})\/(\d{2})\/(\d{4})$/;

function normalizarMes(texto) {
  const limpo = texto.trim();
  return MESES.find((mes) => mes.toLowerCase() === limpo.toLowerCase()) || null;
}

// Le o .odt (é um arquivo zip com XML) e devolve a lista de colaboradores.
async function lerColaboradores(caminhoOdt) {
  const buffer = fs.readFileSync(caminhoOdt);
  const zip = await JSZip.loadAsync(buffer);
  const contentXml = await zip.file('content.xml').async('string');

  const paragrafos = [...contentXml.matchAll(/<text:p[^>]*>(.*?)<\/text:p>/gs)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
    .filter((texto) => texto.length > 0);

  const colaboradores = [];
  let mesAtual = null;

  for (const linha of paragrafos) {
    const mes = normalizarMes(linha);
    if (mes) {
      mesAtual = mes;
      continue;
    }

    const match = LINHA_COLABORADOR.exec(linha);
    if (match && mesAtual) {
      const [, nome, dia, mesNumero, ano] = match;
      colaboradores.push({
        nome: nome.trim(),
        dia: Number(dia),
        mes: Number(mesNumero),
        mesNome: mesAtual,
        ano: Number(ano),
      });
    }
  }

  return colaboradores;
}

module.exports = { lerColaboradores, MESES };
