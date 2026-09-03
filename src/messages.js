const { MESES } = require('./parseOdt');

function formatarData(colaborador) {
  const dia = String(colaborador.dia).padStart(2, '0');
  const mes = String(colaborador.mes).padStart(2, '0');
  return `${dia}/${mes}/${colaborador.ano}`;
}

// Mensagem 1: lista completa por mes, com os aniversariantes do mes corrente destacados.
function montarMensagemCompleta(colaboradores, data) {
  const mesCorrente = data.getMonth() + 1;
  const linhas = ['Aniversário Colaboradores SmartData', ''];

  for (const mesNome of MESES) {
    const numeroMes = MESES.indexOf(mesNome) + 1;
    const doMes = colaboradores
      .filter((c) => c.mes === numeroMes)
      .sort((a, b) => a.dia - b.dia);

    linhas.push(mesNome);
    if (doMes.length === 0) {
      linhas.push('(sem aniversariantes)');
    } else {
      for (const c of doMes) {
        const texto = `${c.nome} ${formatarData(c)}`;
        linhas.push(numeroMes === mesCorrente ? `>> ${texto}` : texto);
      }
    }
    linhas.push('');
  }

  return linhas.join('\n').trim();
}

// Mensagem 2: apenas os aniversariantes do mes corrente, ou aviso de que nao ha nenhum.
function montarMensagemDoMes(aniversariantesDoMes, data) {
  if (aniversariantesDoMes.length === 0) {
    return 'Não temos Anivesariantes este Mês!';
  }

  const mesNome = MESES[data.getMonth()];
  const linhas = [`Aniversariantes de ${mesNome}`, ''];
  for (const c of aniversariantesDoMes) {
    linhas.push(`${c.nome} - ${formatarData(c)}`);
  }
  return linhas.join('\n');
}

module.exports = { montarMensagemCompleta, montarMensagemDoMes, formatarData };
