require('./loadEnv');
const { lerColaboradores } = require('./parseOdt');
const { aniversariantesDoMes } = require('./birthdays');
const { montarMensagemCompleta, montarMensagemDoMes } = require('./messages');
const sms = require('./smsClient');
const db = require('./db');
const { NUMERO_DESTINO, NUMERO_OPERADOR, CAMINHO_ODT, hoje } = require('./config');

const DRY_RUN = process.argv.includes('--dry-run');

async function rodarMensal() {
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

  await sms.enviarParaNumero(NUMERO_DESTINO, [mensagem1, mensagem2]);

  db.registrarEnvioMensal(banco, ano, mes);
  db.gerarLembretes(banco, doMes, ano);

  console.log('\nMensagens enviadas e lembretes individuais gerados com sucesso.');
}

async function rodarLembretes() {
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
    const texto = `Lembrete. Hoje é aniversário de ${lembrete.nome}!`;
    console.log(`Lembrete: ${texto} -> ${NUMERO_DESTINO}`);

    if (!DRY_RUN) {
      await sms.enviarParaNumero(NUMERO_DESTINO, [texto]);
      db.marcarLembreteEnviado(banco, lembrete.id);
    }
  }

  if (DRY_RUN) {
    console.log('\n[dry-run] Nenhuma mensagem foi enviada de verdade.');
  }
}

// Comando usado em producao (um unico timer do systemd, uma vez por dia, 09:00):
// roda o envio mensal quando for dia 1, e sempre verifica os lembretes do dia.
async function rodarDiario() {
  const data = hoje();
  if (data.getDate() === 1) {
    await rodarMensal();
  }
  await rodarLembretes();
}

async function alertarFalha(erro) {
  console.error('Erro na execução:', erro);
  if (DRY_RUN) return;

  try {
    await sms.enviarParaNumero(NUMERO_OPERADOR, [
      `Falha na execução do sistema de Aniversariantes do Mês: ${erro.message}`,
    ]);
  } catch (erroAlerta) {
    console.error('Não foi possível enviar o alerta de falha:', erroAlerta.message);
  }
}

async function main() {
  const comando = process.argv[2];

  if (comando === 'diario') {
    await rodarDiario();
  } else if (comando === 'mensal') {
    await rodarMensal();
  } else if (comando === 'lembretes') {
    await rodarLembretes();
  } else {
    console.log('Uso: node src/index.js <diario|mensal|lembretes> [--dry-run]');
    process.exitCode = 1;
  }
}

main().catch(async (erro) => {
  await alertarFalha(erro);
  process.exitCode = 1;
});
