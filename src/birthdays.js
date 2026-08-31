function aniversariantesDoMes(colaboradores, data) {
  const mes = data.getMonth() + 1;
  return colaboradores
    .filter((c) => c.mes === mes)
    .sort((a, b) => a.dia - b.dia);
}

function aniversarianteDoDia(colaboradores, data) {
  const mes = data.getMonth() + 1;
  const dia = data.getDate();
  return colaboradores.filter((c) => c.mes === mes && c.dia === dia);
}

module.exports = { aniversariantesDoMes, aniversarianteDoDia };
