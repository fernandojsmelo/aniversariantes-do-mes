// Numero de destino das mensagens (producao): +55 86 9986-0339, ver CLAUDE.md e App.md.
// Testes de envio via SMS (mensal e lembrete individual) validados com sucesso
// em 2026-09-03, usando o numero operador (86999973402) como destino temporario.
const NUMERO_DESTINO = process.env.NUMERO_DESTINO || '8699860339';

// Numero operador: chip instalado no celular que roda o app "SMS Gateway for
// Android" e efetivamente dispara os SMS (ver src/smsClient.js).
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
