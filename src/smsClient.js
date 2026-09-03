const BASE_URL = process.env.SMS_GATEWAY_BASE_URL || 'https://api.sms-gate.app/3rdparty/v1';
const LOGIN = process.env.SMS_GATEWAY_LOGIN;
const PASSWORD = process.env.SMS_GATEWAY_PASSWORD;

function cabecalhoAutenticacao() {
  if (!LOGIN || !PASSWORD) {
    throw new Error(
      'Credenciais do SMS Gateway não configuradas. Defina SMS_GATEWAY_LOGIN e SMS_GATEWAY_PASSWORD ' +
        '(geradas no app "SMS Gateway for Android", modo Cloud, no celular do número operador).'
    );
  }
  return `Basic ${Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64')}`;
}

// Numeros no projeto aparecem em formatos variados (com/sem "+55"); a API exige E.164.
function paraE164(numero) {
  const digitos = numero.replace(/\D/g, '');
  const comPais = digitos.startsWith('55') ? digitos : `55${digitos}`;
  return `+${comPais}`;
}

// Envia um SMS via relay na nuvem do "SMS Gateway for Android"
// (https://github.com/android-sms-gateway/sms-gateway). Quem efetivamente
// dispara o SMS e o celular com o chip do numero operador, rodando o app.
async function enviarSms(numeroDestino, texto) {
  const resposta = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: cabecalhoAutenticacao(),
    },
    body: JSON.stringify({
      textMessage: { text: texto },
      phoneNumbers: [paraE164(numeroDestino)],
    }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => '');
    throw new Error(`Falha ao enviar SMS (HTTP ${resposta.status}): ${corpo}`);
  }

  const dados = await resposta.json().catch(() => null);
  console.log('SMS enviado para', numeroDestino, '- id:', dados?.id, 'estado:', dados?.state);
}

// Envia uma ou mais mensagens de texto, em sequencia, para um numero.
async function enviarParaNumero(numeroDestino, mensagens) {
  for (const texto of mensagens) {
    await enviarSms(numeroDestino, texto);
  }
}

module.exports = { enviarParaNumero };
