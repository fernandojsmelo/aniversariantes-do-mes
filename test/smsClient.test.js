const test = require('node:test');
const assert = require('node:assert/strict');

const CAMINHO_MODULO = require.resolve('../src/smsClient');

// smsClient.js le LOGIN/PASSWORD do process.env no topo do arquivo, entao para
// testar cenarios diferentes de credenciais precisamos limpar o cache e
// reexigir o modulo depois de ajustar o ambiente.
function reexigirSmsClient() {
  delete require.cache[CAMINHO_MODULO];
  return require('../src/smsClient');
}

test('enviarParaNumero lanca erro claro quando faltam credenciais', async (t) => {
  const loginOriginal = process.env.SMS_GATEWAY_LOGIN;
  const senhaOriginal = process.env.SMS_GATEWAY_PASSWORD;
  delete process.env.SMS_GATEWAY_LOGIN;
  delete process.env.SMS_GATEWAY_PASSWORD;
  const sms = reexigirSmsClient();

  t.after(() => {
    if (loginOriginal !== undefined) process.env.SMS_GATEWAY_LOGIN = loginOriginal;
    if (senhaOriginal !== undefined) process.env.SMS_GATEWAY_PASSWORD = senhaOriginal;
  });

  await assert.rejects(
    () => sms.enviarParaNumero('86999860339', ['oi']),
    /Credenciais do SMS Gateway não configuradas/
  );
});

test('enviarParaNumero envia cada mensagem em sequencia, autenticado e em E.164', async (t) => {
  process.env.SMS_GATEWAY_LOGIN = 'usuario';
  process.env.SMS_GATEWAY_PASSWORD = 'senha';
  const sms = reexigirSmsClient();

  const chamadas = [];
  const fetchOriginal = global.fetch;
  global.fetch = async (url, opcoes) => {
    chamadas.push({ url, opcoes });
    return {
      ok: true,
      json: async () => ({ id: 'abc', state: 'Pending' }),
    };
  };
  t.after(() => {
    global.fetch = fetchOriginal;
  });

  await sms.enviarParaNumero('86999860339', ['mensagem 1', 'mensagem 2']);

  assert.equal(chamadas.length, 2);
  const corpo1 = JSON.parse(chamadas[0].opcoes.body);
  assert.equal(corpo1.textMessage.text, 'mensagem 1');
  assert.deepEqual(corpo1.phoneNumbers, ['+5586999860339']);
  assert.equal(
    chamadas[0].opcoes.headers.Authorization,
    `Basic ${Buffer.from('usuario:senha').toString('base64')}`
  );
});

test('enviarParaNumero lanca erro quando a API responde com falha', async (t) => {
  process.env.SMS_GATEWAY_LOGIN = 'usuario';
  process.env.SMS_GATEWAY_PASSWORD = 'senha';
  const sms = reexigirSmsClient();

  const fetchOriginal = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 401,
    text: async () => 'Unauthorized',
  });
  t.after(() => {
    global.fetch = fetchOriginal;
  });

  await assert.rejects(
    () => sms.enviarParaNumero('86999860339', ['oi']),
    /Falha ao enviar SMS \(HTTP 401\)/
  );
});
