const test = require('node:test');
const assert = require('node:assert/strict');
const { aniversariantesDoMes, aniversarianteDoDia } = require('../src/birthdays');

const colaboradores = [
  { nome: 'Carlos', dia: 20, mes: 9, ano: 1990 },
  { nome: 'Ana', dia: 5, mes: 9, ano: 1988 },
  { nome: 'Bruno', dia: 15, mes: 3, ano: 1992 },
];

test('aniversariantesDoMes filtra pelo mes corrente e ordena por dia', () => {
  const resultado = aniversariantesDoMes(colaboradores, new Date(2026, 8, 1));
  assert.deepEqual(resultado.map((c) => c.nome), ['Ana', 'Carlos']);
});

test('aniversariantesDoMes retorna lista vazia quando ninguem faz aniversario no mes', () => {
  const resultado = aniversariantesDoMes(colaboradores, new Date(2026, 11, 1));
  assert.deepEqual(resultado, []);
});

test('aniversarianteDoDia filtra por dia e mes exatos', () => {
  const resultado = aniversarianteDoDia(colaboradores, new Date(2026, 8, 5));
  assert.deepEqual(resultado.map((c) => c.nome), ['Ana']);
});

test('aniversarianteDoDia retorna lista vazia quando nao ha aniversario no dia', () => {
  const resultado = aniversarianteDoDia(colaboradores, new Date(2026, 8, 6));
  assert.deepEqual(resultado, []);
});
