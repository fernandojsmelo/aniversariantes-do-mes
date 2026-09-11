const test = require('node:test');
const assert = require('node:assert/strict');
const { montarMensagemCompleta, montarMensagemDoMes, formatarData } = require('../src/messages');

const colaboradores = [
  { nome: 'Carlos', dia: 20, mes: 9, ano: 1990 },
  { nome: 'Ana', dia: 5, mes: 9, ano: 1988 },
  { nome: 'Bruno', dia: 15, mes: 3, ano: 1992 },
];

test('formatarData usa padStart e formato DD/MM/AAAA', () => {
  assert.equal(formatarData({ dia: 5, mes: 9, ano: 1988 }), '05/09/1988');
});

test('montarMensagemCompleta destaca com ">> " apenas os aniversariantes do mes corrente', () => {
  const texto = montarMensagemCompleta(colaboradores, new Date(2026, 8, 1));
  assert.match(texto, />> Ana 05\/09\/1988/);
  assert.match(texto, />> Carlos 20\/09\/1990/);
  assert.doesNotMatch(texto, />> Bruno/);
  assert.match(texto, /Bruno 15\/03\/1992/);
});

test('montarMensagemCompleta marca meses sem aniversariantes', () => {
  const texto = montarMensagemCompleta(colaboradores, new Date(2026, 8, 1));
  assert.match(texto, /Janeiro\n\(sem aniversariantes\)/);
});

test('montarMensagemDoMes lista os aniversariantes do mes ordenados', () => {
  const doMes = [
    { nome: 'Ana', dia: 5, mes: 9, ano: 1988 },
    { nome: 'Carlos', dia: 20, mes: 9, ano: 1990 },
  ];
  const texto = montarMensagemDoMes(doMes, new Date(2026, 8, 1));
  assert.match(texto, /Aniversariantes de Setembro/);
  assert.match(texto, /Ana - 05\/09\/1988/);
  assert.match(texto, /Carlos - 20\/09\/1990/);
});

test('montarMensagemDoMes retorna aviso fixo quando nao ha aniversariantes', () => {
  const texto = montarMensagemDoMes([], new Date(2026, 8, 1));
  assert.equal(texto, 'Não temos Anivesariantes este Mês!');
});
