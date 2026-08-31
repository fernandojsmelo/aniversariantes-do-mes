const fs = require('node:fs');
const path = require('node:path');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

const CAMINHO_SESSAO = path.join(__dirname, '..', '.wwebjs_auth');
const PASTA_PERFIL_CHROME = path.join(CAMINHO_SESSAO, 'session');
const CHROME_PATH = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const TIMEOUT_CONEXAO_MS = 120_000;

function pidVivo(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// Se um processo anterior travou/matou sem fechar o Chrome direito, o profile
// fica com um SingletonLock que trava qualquer nova execucao para sempre (sem erro).
// Aqui verificamos se o dono do lock ainda esta vivo: se estiver, abortamos (ja
// tem uma execucao rodando); se nao estiver, o lock e obsoleto e removemos.
function verificarOuLimparLockObsoleto() {
  const lockPath = path.join(PASTA_PERFIL_CHROME, 'SingletonLock');

  let alvo;
  try {
    alvo = fs.readlinkSync(lockPath);
  } catch {
    return; // sem lock, nada a fazer
  }

  const pid = Number(alvo.split('-').pop());
  if (pid && pidVivo(pid)) {
    throw new Error(
      `Já existe uma execução do WhatsApp em andamento (PID ${pid}). Abortando para evitar conflito.`
    );
  }

  console.log('Lock obsoleto do Chrome encontrado (processo anterior não fechou direito). Limpando...');
  for (const arquivo of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
    fs.rmSync(path.join(PASTA_PERFIL_CHROME, arquivo), { force: true });
  }
  fs.rmSync(path.join(PASTA_PERFIL_CHROME, 'Default', 'LOCK'), { force: true });
}

function criarClient() {
  return new Client({
    authStrategy: new LocalAuth({ dataPath: CAMINHO_SESSAO }),
    puppeteer: {
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });
}

async function destruirComTimeout(client) {
  await Promise.race([
    client.destroy().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 10_000)),
  ]);
}

// Conecta ao WhatsApp Web e aguarda o evento "ready", com timeout para nao
// travar para sempre caso o WhatsApp Web nao carregue.
async function conectar() {
  verificarOuLimparLockObsoleto();

  const client = criarClient();

  await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Tempo esgotado (${TIMEOUT_CONEXAO_MS / 1000}s) aguardando conexão com o WhatsApp Web.`));
    }, TIMEOUT_CONEXAO_MS);

    const finalizar = (fn) => (...args) => {
      clearTimeout(timeoutId);
      fn(...args);
    };

    client.on('qr', (qr) => {
      console.log('\nEscaneie o QR Code abaixo com o WhatsApp do numero operador:\n');
      qrcode.generate(qr, { small: true });
    });

    client.on('loading_screen', (percent, msg) => console.log(`[loading] ${percent}% - ${msg}`));
    client.on('authenticated', () => console.log('[evento] authenticated'));
    client.on('change_state', (state) => console.log('[evento] change_state:', state));
    client.on('disconnected', (reason) => console.log('[evento] disconnected:', reason));
    client.on('ready', finalizar(() => {
      console.log('[evento] ready — sessão conectada como:', client.info?.wid?._serialized);
      resolve();
    }));
    client.on('auth_failure', finalizar((msg) => reject(new Error(`Falha na autenticação: ${msg}`))));

    client.initialize().catch(finalizar(reject));
  }).catch(async (erro) => {
    await destruirComTimeout(client);
    throw erro;
  });

  return client;
}

// Envia uma ou mais mensagens de texto para um numero, usando um client ja conectado.
async function enviarParaNumero(client, numeroDestino, mensagens) {
  const somenteDigitos = numeroDestino.replace(/\D/g, '');

  // Resolve o ID real do contato antes de enviar (evita erro "No LID for user"
  // ao mandar direto para "<numero>@c.us" sem o WhatsApp Web ter esse contato em cache).
  const contato = await client.getNumberId(somenteDigitos);
  if (!contato) {
    throw new Error(`Número ${numeroDestino} não está registrado no WhatsApp.`);
  }

  for (const texto of mensagens) {
    const enviado = await client.sendMessage(contato._serialized, texto);
    console.log('Mensagem enviada para', numeroDestino, '- id:', enviado?.id?._serialized, 'ack:', enviado?.ack);
  }
}

async function desconectar(client) {
  // Da um tempo para o servidor confirmar entrega antes de encerrar a sessao.
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await destruirComTimeout(client);
}

// Atalho para um envio pontual: conecta, manda e desconecta.
async function enviarMensagens(numeroDestino, mensagens) {
  const client = await conectar();
  try {
    await enviarParaNumero(client, numeroDestino, mensagens);
  } finally {
    await desconectar(client);
  }
}

module.exports = { conectar, enviarParaNumero, desconectar, enviarMensagens, destruirComTimeout };
