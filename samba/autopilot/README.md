# Samba Builder — Autopilot (P5 vigilância + P3 auto-evolução governada)

O subsistema de **autopilot** transforma o Samba Builder num software que se
**vigia** (health + telemetria) e se **propõe melhorar** com aprovação humana
(auto-evolução governada). 100% local, sem LLM, sem rede — os três scripts são
**Python stdlib apenas** (`python3`, nada de pip).

```
autopilot/
├── health.py      P5.1  health check de um app gerado (on-demand / agendável)
├── telemetry.py   P3.1  extrai erros/avisos do log do app → feedback/*.jsonl
├── improve.py     P3.2  lê feedback → propostas de melhoria em proposals/*.md
├── feedback/            session-<ts>.jsonl   (produzido pela telemetry)
├── proposals/           <data>.md            (produzido pelo improve)
└── README.md
```

## O ciclo (resumo)

1. **Rodar telemetry (diário / agendável)** — lê `~/Library/Logs/Samba Builder/main.log`
   e grava só erros (`[error]`) e avisos (`[warn]`) relevantes como
   `feedback/session-<timestamp>.jsonl`. Ruído de terceiros (vite, React Router,
   browserslist, console.warn) é filtrado; mensagens repetidas em <5s viram 1
   ocorrência com contador (`count`). **Nunca** lê conteúdo de chat nem grava
   segredos (tokens/chaves são redigidos).
2. **Rodar improve (semanal)** — agrupa o feedback por padrão (`scope` + mensagem
   normalizada), junta a evidência (frequência, último timestamp, exemplo
   sanitizado) e gera uma proposta por padrão em `proposals/<data>.md`. Cada
   proposta traz problema, evidência, sugestão de correção e o comando para
   submetê-la à governança.
3. **Aprovar via governança (humano decide)** — as propostas **nunca** se aplicam
   sozinhas. Evolução de código do produto passa pelo gate de governança
   (`samba/governance/gate.py`); propostas de skill passam por
   `samba/skills/evolution/evolve.py`. É sempre um humano que decide e aprova.

## Uso

```bash
cd /Users/gustavocaetano/Projects/Samba-Builder

# 1) Health check de um app gerado (exit: 0 ok | 1 alertas | 2 erros)
python3 samba/autopilot/health.py ~/samba-apps/busy-sloth-snap

# 2) Telemetria local de sessão (usa o caminho padrão do log)
python3 samba/autopilot/telemetry.py
python3 samba/autopilot/telemetry.py "/caminho/para/outro/main.log"

# 3) Analisador de auto-evolução
python3 samba/autopilot/improve.py                 # varre autopilot/ + skills/ feedback
python3 samba/autopilot/improve.py --min-freq 3    # só padrões com >= 3 ocorrências
python3 samba/autopilot/improve.py --dry-run       # imprime sem escrever arquivo
```

## Agendamento no macOS

### Opção A — cron (mais simples)

Rodar telemetria todo dia às 08:00 e o analisador toda segunda às 09:00:

```bash
crontab -e
# (adicione as linhas, ajustando o caminho do repo)
0 8 * * *  cd /Users/gustavocaetano/Projects/Samba-Builder && /usr/bin/python3 samba/autopilot/telemetry.py >> /tmp/samba-telemetry.log 2>&1
0 9 * * 1  cd /Users/gustavocaetano/Projects/Samba-Builder && /usr/bin/python3 samba/autopilot/improve.py  >> /tmp/samba-improve.log 2>&1
```

> dica: use `/usr/bin/python3` (stdlib do macOS) para não depender de um Python
> de projeto.

### Opção B — launchd (mais robusto, recomendado)

`~/Library/LaunchAgents/com.sambabuilder.autopilot-telemetry.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.sambabuilder.autopilot-telemetry</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>/Users/gustavocaetano/Projects/Samba-Builder/samba/autopilot/telemetry.py</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/gustavocaetano/Projects/Samba-Builder</string>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>8</integer>
    <key>Minute</key><integer>0</integer>
  </dict>
  <key>StandardOutPath</key><string>/tmp/samba-telemetry.log</string>
  <key>StandardErrorPath</key><string>/tmp/samba-telemetry.err</string>
</dict>
</plist>
```

Crie um agente análogo (`...-improve`, `StartCalendarInterval` com `Weekday:1`,
`Hour:9`) e carregue ambos:

```bash
launchctl load ~/Library/LaunchAgents/com.sambabuilder.autopilot-telemetry.plist
launchctl load ~/Library/LaunchAgents/com.sambabuilder.autopilot-improve.plist
```

## Governança & auto-evolução (P3.3/P3.4)

- **Regra dura**: evolução do código do produto é **governada e nunca silenciosa**.
  O autopilot **gera propostas**, não aplica mudanças.
- Um `proposals/<data>.md` bem-sucedido vira trabalho somente após aprovação
  humana. O fluxo do gate está documentado em `samba/governance/gate.py --help`
  e `samba/governance/MODELO.md`.
- Quando um padrão some (erro não volta nas próximas sessões), é sinal de que a
  correção funcionou — arquive a proposta com o veredito.
