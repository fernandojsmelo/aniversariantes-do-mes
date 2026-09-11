const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const JSZip = require('jszip');
const { lerColaboradores } = require('../src/parseOdt');

// Monta um .odt minimo (zip com content.xml) para exercitar o parser sem
// depender do arquivo real de colaboradores.
async function criarOdtFixture(paragrafos) {
  const corpo = paragrafos.map((texto) => `<text:p>${texto}</text:p>`).join('');
  const contentXml = `<?xml version="1.0"?><office:document-content>${corpo}</office:document-content>`;

  const zip = new JSZip();
  zip.file('content.xml', contentXml);
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });

  const caminho = path.join(os.tmpdir(), `fixture-${Date.now()}-${Math.random()}.odt`);
  fs.writeFileSync(caminho, buffer);
  return caminho;
}

test('lerColaboradores associa nome+data ao mes informado antes da linha', async () => {
  const caminho = await criarOdtFixture([
    'Janeiro',
    'Fulano de Tal 10/01/1990',
    'Setembro',
    'Ana Souza 05/09/1988',
    'Carlos Lima 20/09/1990',
  ]);

  try {
    const colaboradores = await lerColaboradores(caminho);
    assert.equal(colaboradores.length, 3);
    assert.deepEqual(colaboradores[1], {
      nome: 'Ana Souza',
      dia: 5,
      mes: 9,
      mesNome: 'Setembro',
      ano: 1988,
    });
  } finally {
    fs.unlinkSync(caminho);
  }
});

test('lerColaboradores ignora linhas fora do formato esperado e mes vazio', async () => {
  const caminho = await criarOdtFixture([
    'Março',
    'Setembro',
    'Texto qualquer sem data',
    'Ana Souza 05/09/1988',
  ]);

  try {
    const colaboradores = await lerColaboradores(caminho);
    assert.deepEqual(colaboradores.map((c) => c.nome), ['Ana Souza']);
  } finally {
    fs.unlinkSync(caminho);
  }
});

test('lerColaboradores ignora nome+data antes de qualquer mes ser declarado', async () => {
  const caminho = await criarOdtFixture(['Ana Souza 05/09/1988']);

  try {
    const colaboradores = await lerColaboradores(caminho);
    assert.deepEqual(colaboradores, []);
  } finally {
    fs.unlinkSync(caminho);
  }
});
