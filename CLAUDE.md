# Aniversariantes do Mês

**Nível:** 1 - Iniciante

## Objetivo

Sistema que lê os aniversários dos colaboradores (arquivo `NascimentoColaboradores.odt`) e envia mensagens automáticas via WhatsApp para o número fixo `+55 86 9986-0339`, avisando quem faz aniversário no mês e, depois, lembrando na data exata de cada aniversário.

## Fonte de dados

- Arquivo: `NascimentoColaboradores.odt` (nesta mesma pasta).
- Formato atual: texto organizado por mês, com linhas `Nome DD/MM/AAAA`.
- Nem todo mês tem colaboradores cadastrados (ex.: Março está vazio no arquivo atual).

## Fases do projeto

### Fase 1 — Leitura e extração dos dados
- Abrir o `.odt` (é um zip com XML) e extrair o texto.
- Interpretar a estrutura por mês e converter em uma lista de registros: `nome`, `data de nascimento`, `mês`, `dia`.
- Validar que todas as linhas foram reconhecidas (nome + data no formato `DD/MM/AAAA`).

### Fase 2 — Identificação dos aniversariantes do mês
- Com base na data atual, filtrar os colaboradores cujo mês de nascimento é o mês corrente.
- Ordenar por dia dentro do mês.
- Tratar o caso de mês sem nenhum aniversariante.

### Fase 3 — Geração das mensagens
- **Mensagem 1:** conteúdo completo do arquivo (todos os meses/colaboradores), em texto, destacando em **negrito** apenas os aniversariantes do mês corrente.
- **Mensagem 2:**
  - Se houver aniversariantes no mês: lista apenas dos aniversariantes do mês.
  - Se não houver: texto fixo `"Não temos Anivesariantes este Mês!"`.

### Fase 4 — Envio via WhatsApp
- Enviar as duas mensagens (nessa ordem) para o número fixo `+55 86 9986-0339`.
- Mecanismo de envio: **whatsapp-web.js** (automação não oficial que controla uma sessão do WhatsApp Web), pois a API oficial da Meta exige cadastro de negócio.
- A sessão do whatsapp-web.js roda autenticada no número `+55 86 99997-3402` (número operador que efetivamente dispara as mensagens).

### Fase 5 — Agendamento mensal
- Executar as Fases 1 a 4 automaticamente todo dia **1º de cada mês, às 09:00**.

### Fase 6 — Lembretes individuais de aniversário
- Após o envio mensal, gerar lembretes para cada aniversariante do mês.
- Cada lembrete deve disparar uma mensagem **no dia exato do aniversário, às 09:00**.

### Fase 7 — Execução automática no Linux
- O programa deve rodar neste computador (Linux).
- Agendamento via **systemd timer** (mais robusto que cron: log integrado via journal, retry, dependência de rede antes de disparar).
- **Um único timer diário** (`systemd/aniversariantes.timer`, 09:00, `America/Fortaleza`) chama `node src/index.js diario`: esse comando roda o envio mensal quando é dia 1 e sempre verifica os lembretes do dia, tudo numa única conexão com o WhatsApp. Optamos por um timer só (em vez de dois) para evitar dois processos abrindo o Chrome no mesmo perfil de sessão ao mesmo tempo (ver "Cuidados adicionais").

## Decisões técnicas confirmadas

1. **Envio de WhatsApp**: `whatsapp-web.js`, autenticado no número `+55 86 99997-3402`. (Motivo: API oficial da Meta exige cadastro de negócio.)
2. **Persistência dos lembretes**: banco de dados simples (ex.: SQLite), para sobreviver a reinícios do agendador.
3. **Agendamento**: `systemd timer` (ver Fase 7).
4. **Formato do "negrito"**: padrão WhatsApp, envolvendo o texto com asteriscos — `*nome do aniversariante*`.
5. **Fuso horário**: `America/Fortaleza` (horário local do número, no Piauí).
6. **Falha de envio**: notificar enviando uma mensagem de alerta para `+55 86 99997-3402` (o próprio número operador), informando a falha.

## Cuidados adicionais a prever

1. **Sessão do WhatsApp (QR Code)**: o `whatsapp-web.js` exige escanear um QR Code uma vez para autenticar. A sessão fica salva localmente (`.wwebjs_auth/`). ✅ Implementado.
2. **Dependência de navegador headless**: a lib usa Puppeteer por trás; configurado para usar o Google Chrome já instalado no sistema (`/usr/bin/google-chrome`) em vez de baixar um Chromium próprio. ✅ Implementado.
3. **Idempotência / evitar duplicidade**: o banco (SQLite) guarda o controle de "já enviado este mês" (`envios_mensais`) e "lembrete já enviado" (`lembretes.enviado`). ✅ Implementado.
4. **Sincronização da lista de colaboradores**: o `.odt` é lido a cada execução (não há importação/cache separado). Decisão: manter simples por ora; se a lista crescer muito, reavaliar.
5. **Não versionar dados sensíveis**: `.wwebjs_auth/` e `data/*.db` estão no `.gitignore`. ✅ Implementado.
6. **Modo de teste (dry-run)**: flag `--dry-run` que roda toda a lógica e mostra as mensagens no console sem enviar de verdade. ✅ Implementado.
7. **Logs**: o script loga no stdout cada etapa (conexão, contato resolvido, id/ack da mensagem, lembretes disparados) — capturado automaticamente pelo journal do systemd. ✅ Implementado.
8. **Duas execuções do WhatsApp ao mesmo tempo**: descoberto durante os testes que dois processos abrindo o Chrome no mesmo perfil de sessão travam um ao outro (lock do Chrome, sem erro visível). Resolvido unificando num único comando `diario` (um timer só) e adicionando limpeza automática de lock obsoleto + detecção de execução já em andamento (`src/whatsappClient.js`). ✅ Implementado.
9. **Timeout de conexão**: se o WhatsApp Web não conectar em 2 minutos, a execução falha com erro claro em vez de travar para sempre (importante para não prender o systemd service indefinidamente). ✅ Implementado.
10. **Alerta de falha**: em caso de erro, o sistema tenta enviar uma mensagem de alerta para o número operador (`+55 86 99997-3402`) antes de encerrar. É best-effort — se a falha for a própria conexão com o WhatsApp, o alerta também pode não conseguir sair. ✅ Implementado.
11. **Fuso horário**: `systemd/aniversariantes.timer` dispara com `OnCalendar=*-*-* 09:00:00 America/Fortaleza` (fuso explícito no próprio timer, não depende do fuso do servidor); o serviço também roda com `Environment=TZ=America/Fortaleza`. ✅ Implementado.
12. **Contas com identidade LID**: durante os testes, o WhatsApp resolveu os números de teste (e até o próprio número operador) como endereços `@lid` em vez do `@c.us` tradicional. Nesses casos, `client.sendMessage` do `whatsapp-web.js` 1.34.7 entrega a mensagem normalmente, mas retorna o objeto sem `id`/`ack` preenchidos — **não é sinal de falha**, é uma limitação de retorno da biblioteca com contas LID. Os logs mostram "id: undefined ack: undefined" mesmo em envios bem-sucedidos.

## Status

Implementado e testado (mensal, lembretes individuais, comando unificado `diario`, dry-run, mês sem aniversariante). Testes feitos com o número `86999167767` como destino. **Antes de ativar em produção**: trocar `NUMERO_DESTINO` para `+55 86 9986-0339` e instalar os timers do systemd (`systemd/aniversariantes.service` e `.timer`).
