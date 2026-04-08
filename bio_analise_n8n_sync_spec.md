# Bio Análise — Especificação do Workflow n8n Sync PCLAB

## 1. Visão Geral

| Campo | Valor |
|-------|-------|
| Nome do Workflow | `BioAnalise_Sync_PCLAB` |
| Objetivo | Sincronizar dados da PCLAB (atendimentos, pacientes, agendamentos) para o PostgreSQL via polling agendado |
| Tipo | Scheduled Workflow |
| Frequência | 4x ao dia (06:00, 12:00, 18:00, 22:00) — ajustável conforme necessidade |
| Fonte | API/REST da PCLAB (mock para desenvolvimento) |
| Destino | PostgreSQL (tabelas do schema final) |

---

## 2. Arquitetura do Sync

```
[PCLAB API] → [HTTP Request] → [Processar Dados] → [Upsert PostgreSQL] → [Atualizar Checkpoint] → [Log]
```

---

## 3. Ordem dos Nós e Funções

### 3.1 Nós de Controle

| Nº | Nome do Nó | Função |
|----|------------|--------|
| 1 | `Cron` | Dispara o workflow na frequência configurada |
| 2 | `Inicializar_Sync` | Carrega checkpoint atual, Define janela de sync, Cria log de execução |
| 3 | `Verificar_Checkpoint` | Verifica se há sync anterior pendente (status=running) |

### 3.2 Nós de Extração

| Nº | Nome do Nó | Função |
|----|------------|--------|
| 4 | `Buscar_Atendimentos_PCLAB` | GET na API PCLAB com `data_inicio` e `data_fim` da janela |
| 5 | `Buscar_Pacientes_PCLAB` | GET na API PCLAB — pacientes dos atendimentos encontrados |
| 6 | `Buscar_Agendamentos_PCLAB` | GET na API PCLAB — agendamentos na janela |

### 3.3 Nós de Processamento

| Nº | Nome do Nó | Função |
|----|------------|--------|
| 7 | `Parser_Atendimentos` | Normaliza dados do JSON PCLAB para schema PostgreSQL |
| 8 | `Parser_Pacientes` | Normaliza dados do JSON PCLAB para schema PostgreSQL |
| 9 | `Parser_Agendamentos` | Normaliza dados do JSON PCLAB para schema PostgreSQL |
| 10 | `Detectar_Mudancas_Atendimentos` | Compara `sync_hash` para determinar insert/update |
| 11 | `Detectar_Mudancas_Pacientes` | Compara `sync_hash` para determinar insert/update |

### 3.4 Nós de Persistência

| Nº | Nome do Nó | Função |
|----|------------|--------|
| 12 | `Upsert_Pacientes` | PostgreSQL: INSERT ON CONFLICT (cpf/telefone) UPDATE |
| 13 | `Upsert_Convenios` | PostgreSQL: INSERT ON CONFLICT (nome) — cria se não existir |
| 14 | `Upsert_Exames` | PostgreSQL: INSERT ON CONFLICT (codigo) — cria se não existir |
| 15 | `Upsert_Precos_Exame` | PostgreSQL: INSERT ON CONFLICT (exame_id, convenio_id, vigencia_inicio) |
| 16 | `Upsert_Atendimentos` | PostgreSQL: INSERT ON CONFLICT (pclab_id) UPDATE |
| 17 | `Upsert_Atendimento_Exames` | PostgreSQL: INSERT ON CONFLICT (atendimento_id, exame_id) |
| 18 | `Upsert_Agendamentos` | PostgreSQL: INSERT ON CONFLICT (pclab_id) ou por (paciente_id, data_preferida) |

### 3.5 Nós de Finalização

| Nº | Nome do Nó | Função |
|----|------------|--------|
| 19 | `Atualizar_Checkpoint` | Atualiza `sync_checkpoint` com timestamp e window |
| 20 | `Finalizar_Log` | Atualiza `sync_log` com status, contadores, erros |
| 21 | `Notificar_Erro` | Envia alerta se sync falhar |

---

## 4. Estratégia de Janela Incremental

### 4.1 Definição de Janela

- **Janela fixa**: sync busca dados dos últimos 2 dias (retroativo)
- **Sobreposição**: a próxima execução usa janela do último sync até agora, com **1 hora de buffer** sobre o fim

### 4.2 Exemplo de Execução

| Execução | Início | Fim | Buffer |
|----------|--------|-----|--------|
| 1ª (06:00) | Ontem 00:00 | Hoje 04:00 | +1h |
| 2ª (12:00) | Ontem 00:00 | Hoje 10:00 | +1h |
| 3ª (18:00) | Ontem 00:00 | Hoje 16:00 | +1h |
| 4ª (22:00) | Ontem 00:00 | Hoje 20:00 | +1h |

**Justificativa**: O buffer de 1h previne perda de registroscreated_at exatamente na borda do horário.

### 4.3 Primeira Execução

- **Checkpoint inicial**: busca últimos 30 dias
- **Modo backfill**: processa tudo sem verificar checkpoint
- **Ao final**: salva checkpoint com timestamp atual

### 4.4 Comportamento em Falha

- Se falhar antes do upsert: registra erro, mantém checkpoint anterior
- Se falhar no upsert: registra erro no log, marca status `partial`
- Próxima execução retoma do último checkpoint válido

---

## 5. Lógica de Upsert

### 5.1 Ordem de Execução (CRÍTICA)

1. **Convênios** → sem dependências
2. **Exames** → sem dependências
3. **Preços de Exames** → depende de exames e convênios
4. **Pacientes** → sem dependências (mas usado como FK)
5. **Atendimentos** → depende de pacientes, convênios, funcionários
6. **Atendimento Exames** → depende de atendimentos e exames
7. **Agendamentos** → depende de pacientes e convênios

**Por que esta ordem?**
- Resolve dependências de FK antes de usar
- Impede falha por referência inexistente
- Se atendimentos falham, exames já estão importados

### 5.2 Detecção de Mudanças

```javascript
// Pseudo-código no nó Detectar_Mudancas
const sync_hash = md5(JSON.stringify({
  valor_total: row.valor_total,
  situacao: row.situacao,
  exames: row.exames
}));

const existing = await pg.query(
  'SELECT sync_hash FROM atendimentos WHERE pclab_id = $1',
  [row.pclab_id]
);

if (!existing || existing.sync_hash !== sync_hash) {
  return { action: 'upsert', data: row };
}
return { action: 'skip', reason: 'hash_igual' };
```

---

## 6. Reconciliação Agendamentos vs Atendimentos

### 6.1 Estratégia

A reconciliação é feita **após o sync de atendimentos**, utilizando uma view do PostgreSQL (`v_reconciliacao_agendamento_atendimento`):

```sql
-- A view compara:
-- - agendamento.data_preferida = atendimento.data_atendimento
-- - agendamento.paciente_id = atendimento.paciente_id
-- - atendimento.situacao = 'realizado'
```

### 6.2 Casos de Status

| Caso | Condição | Status na View |
|------|----------|----------------|
| OK | Atendimento encontrado e realizado | `OK` |
| Falta atendimento | Agendamento realizado mas sem atendimento | `FALTA_ATENDIMENTO` |
| Pendente atrasado | Status solicitado/confirmado e data passou | `PENDENTE_ATRASADO` |
| Pendente | Status solicitado/confirmado e data futura | `PENDENTE` |

### 6.3 Ação do Workflow

- Ao final do sync, executar query de reconciliação
- Se `status_reconciliacao = 'FALTA_ATENDIMENTO'`:
  - Criar registro em log de alerta
  - Opcional: notificar atendente via webhook

---

## 7. Tratamento de Erros

### 7.1 Tipos de Erro e Ação

| Tipo | Ação |
|------|------|
| API PCLAB inacessível | Retry 3x com intervalo exponencial (1min, 2min, 4min) |
|Timeout de requisição | Marcar como falha, manter checkpoint |
| FK não existe (convenio/exame) | Criar registro com nome genérico ("DESCONHECIDO") |
| Dados duplicados (pclab_id) | Update, não insert |
| Erro de parse JSON | Logar erro, continuar com próximo registro |
| PostgreSQL indisponível | Abortar, não atualizar checkpoint |

### 7.2 Retry Automático

- Usar nó `Retry` do n8n ou lógica no nó de erro
- Limite: 3 tentativas
- Backoff: exponencial (1m, 2m, 4m)

### 7.3 Alertas

- Se status = `failed` ou `partial`:
  - Enviar email para admin (via SendEmail ou webhook)
  - Incluir no log: `errors` array com detalhes

---

## 8. Prevenção de Duplicidade

### 8.1 Estratégias

| Estratégia | Aplicação |
|------------|-----------|
| `pclab_id` único | Tabela atendimentos, agendamentos |
| `cpf` único | Tabela pacientes (se disponível na PCLAB) |
| `telefone` normalizado | Tabela pacientes (busca por dedup) |
| `sync_hash` | Detectar mudanças nos atendimentos |
| `unique(codigo)` | Tabela exames |

### 8.2 Upsert comconflict

```sql
INSERT INTO atendimentos (pclab_id, paciente_id, data_atendimento, valor_total, situacao, sync_hash)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (pclab_id) DO UPDATE SET
  valor_total = EXCLUDED.valor_total,
  situacao = EXCLUDED.situacao,
  sync_hash = EXCLUDED.sync_hash,
  updated_at = NOW()
WHERE atendimentos.sync_hash != EXCLUDED.sync_hash
RETURNING id;
```

---

## 9. Checkpoint e Auditoria

### 9.1 Tabela sync_checkpoint

| Campo | Descrição |
|-------|------------|
| `sync_type` | Identificador do tipo de sync (ex: `pclab_atendimentos`) |
| `last_sync_start` | Timestamp de início do último sync |
| `last_sync_end` | Timestamp de fim do último sync |
| `last_record_ts` | Timestamp do último registro processado |
| `last_record_id` | ID do último registro processado |
| `window_start` | Início da janela de busca |
| `window_end` | Fim da janela de busca |
| `config` | JSON com configurações (ex: filtros) |

### 9.2 Tabela sync_log

| Campo | Descrição |
|-------|------------|
| `sync_type` | Tipo de sync |
| `started_at` | Início |
| `finished_at` | Fim |
| `status` | `running`, `success`, `failed`, `partial` |
| `records_processed` | Total processado |
| `records_created` | Criados |
| `records_updated` | Atualizados |
| `records_skipped` | Ignorados (hash igual) |
| `errors` | Array de erros |
| `checkpoint` | Snapshot do checkpoint usado |

---

## 10. Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `PCLAB_API_URL` | URL base da API PCLAB |
| `PCLAB_API_KEY` | Chave de autenticação |
| `PG_HOST` | Host do PostgreSQL |
| `PG_PORT` | Porta (padrão 5432) |
| `PG_DATABASE` | Nome do banco |
| `PG_USER` | Usuário |
| `PG_PASSWORD` | Senha |
| `SYNC_WINDOW_HOURS` | Janela de busca em horas (padrão 48) |
| `SYNC_BUFFER_HOURS` | Buffer de sobreposição em horas (padrão 1) |
| `ALERT_WEBHOOK_URL` | Webhook para alertas de falha |

---

## 11. Validações Prévias à Execução

Antes de ativar o workflow em produção:

- [ ] PostgreSQL acessível a partir do n8n
- [ ] API PCLAB respondendo com dados de teste
- [ ] Credenciais de acesso válidas
- [ ] Schema SQL executado completamente
- [ ] Teste de upsert com dados reais
- [ ] Teste de reconciliação com dados históricos
- [ ] Notificações de erro configuradas
- [ ] Dashboard de monitoring acessível

---

## 12. Fluxo Completo (Diagrama Texto)

```
Cron
  └─> Inicializar_Sync
        └─> Verificar_Checkpoint
              ├─> [Checkpoint existe] ─> Buscar_Atendimentos_PCLAB
              │                                 └─> Parser_Atendimentos
              │                                       └─> Detectar_Mudancas_Atendimentos
              │                                             ├─> [Mudou] ─> Upsert_Atendimentos
              │                                             │                     └─> Upsert_Atendimento_Exames
              │                                             └─> [Igual] ─> (skip)
              │
              ├─> [Checkpoint não existe] ─> (primeira execução: backfill 30 dias)
              │
              ├─> Buscar_Pacientes_PCLAB
              │     └─> Parser_Pacientes
              │           └─> Upsert_Pacientes
              │
              ├─> Buscar_Agendamentos_PCLAB
              │     └─> Parser_Agendamentos
              │           └─> Upsert_Agendamentos
              │
              └─> Reconciliar_Agendamentos
                    └─> [Alerta se FALTA_ATENDIMENTO]
                          └─> Atualizar_Checkpoint
                                └─> Finalizar_Log
                                      └─> [Se erro] ─> Notificar_Erro
```

---

## 13. Considerações Importantes

1. **Source of truth**: O `valor_total` do atendimento deve ser lido da PCLAB — não calcular a partir dos itens.

2. **Particular semconvênio_id fixo**: O sistema deve procurar conveniovazio ou "PARTICULAR" no momento do sync, não usar ID fixo hardcoded.

3. **Aliases de exames**: O sync PCLAB → PostgreSQL deve populartabela `exames` com o código PCLAB; aliases são populados manualmente ou por outro processo.

4. **Histórico de preços**: Cada alteração de preço cria um novo registro em `preco_exame` com `vigencia_inicio`; nunca fazer update no registro existente.

5. **Primeira execução**: Rodar manualmente uma vez antes de ativar o schedule para validar integração.

---

*Documento gerado em 07/04/2026 | Bio Análise — Especificação Sync PCLAB v1.0*