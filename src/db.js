const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const CAMINHO_DB = path.join(__dirname, '..', 'data', 'aniversariantes.db');

function abrirBanco() {
  const db = new DatabaseSync(CAMINHO_DB);

  db.exec(`
    CREATE TABLE IF NOT EXISTS envios_mensais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ano INTEGER NOT NULL,
      mes INTEGER NOT NULL,
      enviado_em TEXT NOT NULL,
      UNIQUE(ano, mes)
    );

    CREATE TABLE IF NOT EXISTS lembretes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      dia INTEGER NOT NULL,
      mes INTEGER NOT NULL,
      ano_referencia INTEGER NOT NULL,
      enviado INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL,
      enviado_em TEXT,
      UNIQUE(nome, dia, mes, ano_referencia)
    );
  `);

  return db;
}

function jaEnviouMensal(db, ano, mes) {
  const linha = db
    .prepare('SELECT 1 FROM envios_mensais WHERE ano = ? AND mes = ?')
    .get(ano, mes);
  return Boolean(linha);
}

function registrarEnvioMensal(db, ano, mes) {
  db.prepare(
    'INSERT OR IGNORE INTO envios_mensais (ano, mes, enviado_em) VALUES (?, ?, ?)'
  ).run(ano, mes, new Date().toISOString());
}

function gerarLembretes(db, aniversariantes, ano) {
  const inserir = db.prepare(`
    INSERT OR IGNORE INTO lembretes (nome, dia, mes, ano_referencia, enviado, criado_em)
    VALUES (?, ?, ?, ?, 0, ?)
  `);
  const agora = new Date().toISOString();
  for (const c of aniversariantes) {
    inserir.run(c.nome, c.dia, c.mes, ano, agora);
  }
}

function lembretesPendentesDoDia(db, dia, mes, ano) {
  return db
    .prepare(
      'SELECT * FROM lembretes WHERE dia = ? AND mes = ? AND ano_referencia = ? AND enviado = 0'
    )
    .all(dia, mes, ano);
}

function marcarLembreteEnviado(db, id) {
  db.prepare(
    'UPDATE lembretes SET enviado = 1, enviado_em = ? WHERE id = ?'
  ).run(new Date().toISOString(), id);
}

module.exports = {
  abrirBanco,
  jaEnviouMensal,
  registrarEnvioMensal,
  gerarLembretes,
  lembretesPendentesDoDia,
  marcarLembreteEnviado,
};
