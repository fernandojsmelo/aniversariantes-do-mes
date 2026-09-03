const fs = require('node:fs');
const path = require('node:path');

// Le o ".env" na raiz do projeto manualmente (sem depender de flag do Node nem
// de dependencia externa), pois a versao de "node" resolvida pelo PATH varia
// conforme quem chama o script (shell interativo com nvm vs. npm/systemd).
function carregarEnv() {
  const caminho = path.join(__dirname, '..', '.env');
  let conteudo;
  try {
    conteudo = fs.readFileSync(caminho, 'utf8');
  } catch {
    return; // .env e opcional (ex.: em --dry-run sem credenciais)
  }

  for (const linha of conteudo.split('\n')) {
    const semEspacos = linha.trim();
    if (!semEspacos || semEspacos.startsWith('#')) continue;

    const posIgual = semEspacos.indexOf('=');
    if (posIgual === -1) continue;

    const chave = semEspacos.slice(0, posIgual).trim();
    let valor = semEspacos.slice(posIgual + 1).trim();
    const aspas = (valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"));
    if (aspas) {
      valor = valor.slice(1, -1);
    }

    if (process.env[chave] === undefined) {
      process.env[chave] = valor;
    }
  }
}

carregarEnv();
