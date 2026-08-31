const { lerColaboradores } = require('./parseOdt');
const { aniversariantesDoMes } = require('./birthdays');
const { montarMensagemCompleta, montarMensagemDoMes } = require('./messages');
const whatsapp = require('./whatsappClient');
const db = require('./db');
const { NUMERO_DESTINO, NUMERO_OPERADOR, CAMINHO_ODT, hoje } = require('./config');

const DRY_RUN = process.argv.includes('--dry-run');

let clientAtivo = null;

async function rodarMensal(client) {
  const data = hoje();
  const ano = data.getFullYear();
  const mes = data.getMonth() + 1;
  const banco = db.abrirBanco();

  if (db.jaEnviouMensal(banco, ano, mes)) {
    console.log(`Envio mensal de ${mes}/${ano} já foi feito. Nada a fazer.`);
    return;
  }

  const colaboradores = await lerColaboradores(CAMINHO_ODT);
  const doMes = aniversariantesDoMes(colaboradores, data);

  const mensagem1 = montarMensagemCompleta(colaboradores, data);
  const mensagem2 = montarMensagemDoMes(doMes, data);

  console.log('--- Mensagem 1 (completa) ---');
  console.log(mensagem1);
  console.log('\n--- Mensagem 2 (do mês) ---');
  console.log(mensagem2);
  console.log(`\nDestino: ${NUMERO_DESTINO}`);

  if (DRY_RUN) {
    console.log('\n[dry-run] Nenhuma mensagem foi enviada de verdade.');
    return;
  }

  await whatsapp.enviarParaNumero(client, NUMERO_DESTINO, [mensagem1, mensagem2]);

  db.registrarEnvioMensal(banco, ano, mes);
  db.gerarLembretes(banco, doMes, ano);

  console.log('\nMensagens enviadas e lembretes individuais gerados com sucesso.');
}

async function rodarLembretes(client) {
  const data = hoje();
  const dia = data.getDate();
  const mes = data.getMonth() + 1;
  const ano = data.getFullYear();
  const banco = db.abrirBanco();

  const pendentes = db.lembretesPendentesDoDia(banco, dia, mes, ano);

  if (pendentes.length === 0) {
    console.log(`Nenhum lembrete pendente para ${dia}/${mes}/${ano}.`);
    return;
  }

  for (const lembrete of pendentes) {
    const texto = `Lembrete. 🎂 Hoje é aniversário de ${lembrete.nome}!`;
    console.log(`Lembrete: ${texto} -> ${NUMERO_DESTINO}`);

    if (!DRY_RUN) {
      await whatsapp.enviarParaNumero(client, NUMERO_DESTINO, [texto]);
      db.marcarLembreteEnviado(banco, lembrete.id);
    }
  }

  if (DRY_RUN) {
    console.log('\n[dry-run] Nenhuma mensagem foi enviada de verdade.');
  }
}

// Comando usado em producao (um unico timer do systemd, uma vez por dia, 09:00):
// roda o envio mensal quando for dia 1, e sempre verifica os lembretes do dia,
// tudo numa unica conexao com o WhatsApp (evita duas instancias do Chrome disputando
// o mesmo perfil ao mesmo tempo).
async function rodarDiario() {
  const data = hoje();
  const client = DRY_RUN ? null : await conectarEGuardar();

  try {
    if (data.getDate() === 1) {
      await rodarMensal(client);
    }
    await rodarLembretes(client);
  } finally {
    if (client) {
      await whatsapp.desconectar(client);
      clientAtivo = null;
    }
  }
}

async function conectarEGuardar() {
  clientAtivo = await whatsapp.conectar();
  return clientAtivo;
}

async function rodarComandoUnico(executar) {
  const client = DRY_RUN ? null : await conectarEGuardar();
  try {
    await executar(client);
  } finally {
    if (client) {
      await whatsapp.desconectar(client);
      clientAtivo = null;
    }
  }
}

async function alertarFalha(erro) {
  console.error('Erro na execução:', erro);
  if (DRY_RUN) return;

  try {
    const client = clientAtivo || (await whatsapp.conectar());
    await whatsapp.enviarParaNumero(client, NUMERO_OPERADOR, [
      `⚠️ Falha na execução do sistema de Aniversariantes do Mês:\n${erro.message}`,
    ]);
    if (!clientAtivo) {
      await whatsapp.desconectar(client);
    }
  } catch (erroAlerta) {
    console.error('Não foi possível enviar o alerta de falha:', erroAlerta.message);
  }
}

function registrarEncerramentoGracioso() {
  for (const sinal of ['SIGTERM', 'SIGINT']) {
    process.on(sinal, async () => {
      console.log(`\nRecebido ${sinal}, encerrando sessão do WhatsApp...`);
      if (clientAtivo) {
        await whatsapp.destruirComTimeout(clientAtivo);
      }
      process.exit(0);
    });
  }
}

async function main() {
  registrarEncerramentoGracioso();
  const comando = process.argv[2];

  if (comando === 'diario') {
    await rodarDiario();
  } else if (comando === 'mensal') {
    await rodarComandoUnico(rodarMensal);
  } else if (comando === 'lembretes') {
    await rodarComandoUnico(rodarLembretes);
  } else {
    console.log('Uso: node src/index.js <diario|mensal|lembretes> [--dry-run]');
    process.exitCode = 1;
  }
}

main().catch(async (erro) => {
  await alertarFalha(erro);
  process.exitCode = 1;
});
