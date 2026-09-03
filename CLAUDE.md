# Aniversariantes do Mês

**Nível:** 1 - Iniciante

## Objetivo

Sistema que lê os aniversários dos colaboradores (arquivo `NascimentoColaboradores.odt`) e envia mensagens de texto (SMS) automáticas para o número fixo `+55 86 9986-0339`, avisando quem faz aniversário no mês e, depois, lembrando na data exata de cada aniversário.

> **Migração WhatsApp → SMS concluída (2026-09-03):** o sistema enviava por `whatsapp-web.js`; passou a enviar SMS via "SMS Gateway for Android" (ver Fase 4 e Decisão 1). Testado ponta a ponta (mensal + lembrete) e em produção com `NUMERO_DESTINO = 8699860339`. Ver seção "Status".

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

### Fase 4 — Envio via SMS
- Enviar as duas mensagens (nessa ordem) para o número fixo `+55 86 9986-0339`.
- Mecanismo de envio: app **"SMS Gateway for Android"** (https://github.com/android-sms-gateway/sms-gateway) instalado no celular do número operador, modo *cloud relay* (`api.sms-gate.app`) — o servidor Linux chama a API HTTP do relay, que repassa para o celular disparar o SMS pelo chip real.
- O chip que efetivamente dispara os SMS é o do número operador `+55 86 99997-3402` (mesmo número usado anteriormente na sessão do WhatsApp).
- Credenciais (login/senha gerados no app) ficam em variáveis de ambiente `SMS_GATEWAY_LOGIN`/`SMS_GATEWAY_PASSWORD` (ver `.env.example`), nunca versionadas.

### Fase 5 — Agendamento mensal
- Executar as Fases 1 a 4 automaticamente todo dia **1º de cada mês, às 09:00**.

### Fase 6 — Lembretes individuais de aniversário
- Após o envio mensal, gerar lembretes para cada aniversariante do mês.
- Cada lembrete deve disparar uma mensagem **no dia exato do aniversário, às 09:00**.

### Fase 7 — Execução automática no Linux
- O programa deve rodar neste computador (Linux).
- Agendamento via **systemd timer** (mais robusto que cron: log integrado via journal, retry, dependência de rede antes de disparar).
- **Um único timer diário** (`systemd/aniversariantes.timer`, 09:00, `America/Fortaleza`) chama `node src/index.js diario`: esse comando roda o envio mensal quando é dia 1 e sempre verifica os lembretes do dia. Como o envio agora é uma chamada HTTP sem estado (sem sessão/Chrome), não há mais risco de duas execuções disputando um mesmo perfil — mas mantivemos o timer único por simplicidade.

## Decisões técnicas confirmadas

1. **Envio de SMS**: app "SMS Gateway for Android", modo cloud relay (`api.sms-gate.app`), autenticado via `SMS_GATEWAY_LOGIN`/`SMS_GATEWAY_PASSWORD` (env vars). O chip que dispara é o do número operador `+55 86 99997-3402`. (Histórico: antes era `whatsapp-web.js`, trocado porque a API oficial da Meta exige cadastro de negócio e o objetivo passou a ser SMS puro.)
2. **Persistência dos lembretes**: banco de dados simples (ex.: SQLite), para sobreviver a reinícios do agendador.
3. **Agendamento**: `systemd timer` (ver Fase 7).
4. **Formato de destaque**: SMS é texto plano — sem negrito. O aniversariante do mês corrente é destacado na Mensagem 1 com o prefixo `>> ` em vez do antigo `*negrito*` do WhatsApp.
5. **Fuso horário**: `America/Fortaleza` (horário local do número, no Piauí).
6. **Falha de envio**: notificar enviando um SMS de alerta para `+55 86 99997-3402` (o próprio número operador), informando a falha.

## Cuidados adicionais a prever

1. **Credenciais do SMS Gateway**: login/senha ficam em `.env` (não versionado — ver `.env.example`). O `smsClient.js` lança erro claro se não estiverem definidas. ✅ Implementado. **Importante**: essas credenciais NÃO são escolhidas pelo usuário (não é e-mail/senha própria) — são geradas automaticamente pelo app na primeira conexão bem-sucedida (Cloud Server → tocar "Offline" para conectar) e aparecem na tela do app, na seção "Cloud Server". Usar credenciais de outra origem resulta em `401 Unauthorized`.
2. **Idempotência / evitar duplicidade**: o banco (SQLite) guarda o controle de "já enviado este mês" (`envios_mensais`) e "lembrete já enviado" (`lembretes.enviado`). ✅ Implementado.
3. **Sincronização da lista de colaboradores**: o `.odt` é lido a cada execução (não há importação/cache separado). Decisão: manter simples por ora; se a lista crescer muito, reavaliar.
4. **Não versionar dados sensíveis**: `.env` e `data/*.db` estão no `.gitignore`. ✅ Implementado.
5. **Modo de teste (dry-run)**: flag `--dry-run` que roda toda a lógica e mostra as mensagens no console sem enviar de verdade. ✅ Implementado.
6. **Logs**: o script loga no stdout cada etapa (mensagens geradas, id/estado retornado pela API do gateway, lembretes disparados) — capturado automaticamente pelo journal do systemd. ✅ Implementado.
7. **Alerta de falha**: em caso de erro, o sistema tenta enviar um SMS de alerta para o número operador (`+55 86 99997-3402`) antes de encerrar. É best-effort — se a falha for do próprio gateway/credenciais, o alerta também não vai conseguir sair (fica só no log). ✅ Implementado.
8. **Fuso horário**: `systemd/aniversariantes.timer` dispara com `OnCalendar=*-*-* 09:00:00 America/Fortaleza` (fuso explícito no próprio timer, não depende do fuso do servidor); o serviço também roda com `Environment=TZ=America/Fortaleza`. ✅ Implementado.
9. **Custo/segmentação do SMS**: mensagens longas (ex.: Mensagem 1, com todos os colaboradores) podem ser quebradas em vários segmentos pela operadora/gateway, com custo maior. Ainda não avaliado — revisar se o conteúdo da Mensagem 1 deve ser resumido.
10. **Resquícios do WhatsApp**: `.wwebjs_auth/` e `.wwebjs_cache/` (sessão antiga) não são mais usados e podem ser apagados manualmente quando não forem mais necessários para referência.

## Status

**Migração WhatsApp → SMS concluída e em produção (2026-09-03).** Código usando o app "SMS Gateway for Android" (relay cloud) no lugar do `whatsapp-web.js`.

- **Envio (remetente)**: chip do número operador `+55 86 99997-3402`, via app instalado no celular. App instalado, permissão `SEND_SMS` liberada (era necessário destravar "Permitir configurações restritas" no Android, por ser app instalado via APK fora da Play Store) e credenciais `SMS_GATEWAY_LOGIN`/`SMS_GATEWAY_PASSWORD` configuradas em `.env`. ✅
- **Testes ponta a ponta (2026-09-03)**: envio mensal (mensagem completa + mensagem do mês) e lembrete individual, ambos com status `Delivered` confirmado via API e recebimento confirmado no celular de teste. ✅
- **Recebimento (destino)**: `NUMERO_DESTINO` em `src/config.js` já trocado para produção — `8699860339` (`+55 86 9986-0339`). ✅
- **systemd**: timer/service já estavam instalados (de quando o sistema ainda usava WhatsApp) em `~/.config/systemd/user/`; unit `.service` sincronizada com a versão atual do repo (SMS) e `daemon-reload` aplicado. Próximo disparo: todo dia às 09:00 (`America/Fortaleza`). ✅
