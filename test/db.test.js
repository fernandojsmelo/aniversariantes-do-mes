const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');

// Cada teste abre um banco em memoria isolado - nunca o data/aniversariantes.db real.
function bancoDeTeste() {
  return db.abrirBanco(':memory:');
}

test('jaEnviouMensal comeca false e vira true apos registrarEnvioMensal', () => {
  const banco = bancoDeTeste();
  assert.equal(db.jaEnviouMensal(banco, 2026, 9), false);

  db.registrarEnvioMensal(banco, 2026, 9);
  assert.equal(db.jaEnviouMensal(banco, 2026, 9), true);

  // Mes/ano diferentes nao sao afetados.
  assert.equal(db.jaEnviouMensal(banco, 2026, 10), false);
  assert.equal(db.jaEnviouMensal(banco, 2025, 9), false);
});

test('registrarEnvioMensal e idempotente (INSERT OR IGNORE)', () => {
  const banco = bancoDeTeste();
  db.registrarEnvioMensal(banco, 2026, 9);
  assert.doesNotThrow(() => db.registrarEnvioMensal(banco, 2026, 9));
  assert.equal(db.jaEnviouMensal(banco, 2026, 9), true);
});

test('gerarLembretes cria um lembrete pendente por aniversariante', () => {
  const banco = bancoDeTeste();
  db.gerarLembretes(
    banco,
    [
      { nome: 'Ana', dia: 5, mes: 9 },
      { nome: 'Carlos', dia: 20, mes: 9 },
    ],
    2026
  );

  const pendentesDia5 = db.lembretesPendentesDoDia(banco, 5, 9, 2026);
  assert.equal(pendentesDia5.length, 1);
  assert.equal(pendentesDia5[0].nome, 'Ana');
  assert.equal(pendentesDia5[0].enviado, 0);
});

test('gerarLembretes nao duplica lembrete ja existente (mesma pessoa/dia/mes/ano)', () => {
  const banco = bancoDeTeste();
  const aniversariante = [{ nome: 'Ana', dia: 5, mes: 9 }];
  db.gerarLembretes(banco, aniversariante, 2026);
  db.gerarLembretes(banco, aniversariante, 2026);

  assert.equal(db.lembretesPendentesDoDia(banco, 5, 9, 2026).length, 1);
});

test('marcarLembreteEnviado remove o lembrete da lista de pendentes', () => {
  const banco = bancoDeTeste();
  db.gerarLembretes(banco, [{ nome: 'Ana', dia: 5, mes: 9 }], 2026);
  const [lembrete] = db.lembretesPendentesDoDia(banco, 5, 9, 2026);

  db.marcarLembreteEnviado(banco, lembrete.id);

  assert.equal(db.lembretesPendentesDoDia(banco, 5, 9, 2026).length, 0);
});
