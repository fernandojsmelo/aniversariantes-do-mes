// Numero fixo de destino das mensagens de producao (ver CLAUDE.md e App.md): 86 9986-0339
const NUMERO_DESTINO = process.env.NUMERO_DESTINO || '8699860339';

// Numero operador: e a conta autenticada no whatsapp-web.js (quem efetivamente envia).
// Usado tambem como destino dos alertas de falha (ver CLAUDE.md, Decisao 6).
const NUMERO_OPERADOR = '+5586999973402';

const CAMINHO_ODT = require('node:path').join(__dirname, '..', 'NascimentoColaboradores.odt');

// Permite simular "hoje" para testes, ex.: APP_HOJE=2026-09-01
function hoje() {
  if (process.env.APP_HOJE) {
    return new Date(`${process.env.APP_HOJE}T09:00:00`);
  }
  return new Date();
}

module.exports = { NUMERO_DESTINO, NUMERO_OPERADOR, CAMINHO_ODT, hoje };
