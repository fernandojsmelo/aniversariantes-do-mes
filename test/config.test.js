const test = require('node:test');
const assert = require('node:assert/strict');
const { hoje } = require('../src/config');

test('hoje() usa APP_HOJE quando definido, para permitir simular datas', (t) => {
  const original = process.env.APP_HOJE;
  process.env.APP_HOJE = '2026-09-01';
  t.after(() => {
    if (original === undefined) delete process.env.APP_HOJE;
    else process.env.APP_HOJE = original;
  });

  const data = hoje();
  assert.equal(data.getFullYear(), 2026);
  assert.equal(data.getMonth(), 8); // Setembro (0-indexado)
  assert.equal(data.getDate(), 1);
});

test('hoje() retorna a data atual quando APP_HOJE nao esta definido', (t) => {
  const original = process.env.APP_HOJE;
  delete process.env.APP_HOJE;
  t.after(() => {
    if (original !== undefined) process.env.APP_HOJE = original;
  });

  const antes = Date.now();
  const data = hoje();
  const depois = Date.now();
  assert.ok(data.getTime() >= antes && data.getTime() <= depois);
});
