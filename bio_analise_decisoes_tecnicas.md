# Bio Análise — Decisões Técnicas

## 1. Parecer Técnico Final

O projeto **Bio Análise CRM** está preparado para implementação da arquitetura definida:

- **Schema PostgreSQL** consolidado e pronto para execução
- **Workflow n8n** especificado com estratégia de sync incremental segura
- **Documentação técnica** alinhada entre as três camadas

A arquitetura proposta atende aos requisitos de integração PCLAB → PostgreSQL → n8n → painel Next.js + agente WhatsApp.

---

## 2. Decisões Arquiteturais Adotadas

| Decisão | Justificativa |
|---------|---------------|
| Sync por polling (não webhook) | PCLAB não expõe webhook confiável; polling com janela de 48h + buffer de 1h é seguro |
| `valor_total` da PCLAB como source of truth | Garante consistência financeira; não recalcular a partir de itens |
| Entidades separadas (exame, preço, preparo) | Permite evolução independente: preço muda sem alterar preparo |
| Checkpoint com buffer de 1h | Evita perda de registros na borda de janela |
| Reconciliação por view PostgreSQL | Consulta declarativa, executada após sync; simples e auditável |
| `sync_hash` para detecção de mudanças | Evita reescrita desnecessária; performance e integridade |

---

## 3. Premissas

1. **API PCLAB** fornece endpoint REST com dados de pacientes, atendimentos e agendamentos
2. **PostgreSQL** está acessível pelo n8n (mesma rede ou VPN)
3. **n8n** tem acesso à internet para chamadas HTTP
4. **Primeira execução** pode usar janela maior (30 dias) para backfill
5. **Convenio "PARTICULAR"** existe como registro no banco (criado automaticamente)
6. **Exames** são populados inicialmente via sync; manutenção manual ou por processo separado

---

## 4. Distinção de Dados

### 4.1 Dado Mestre Atualizável

| Tabela | Campo | Comportamento |
|--------|-------|---------------|
| `pacientes` | nome, telefone, email, endereço | Update permitido; mantém histórico via `updated_at` |
| `convenios` | nome, observacoes | Update permitido |
| `exames` | nome, aliases, preparo, categoria | Update permitido; `codigo` imutável |
| `funcionarios` | nome, cargo, permissao | Update permitido |

### 4.2 Preço Vigente

O preço vigente é determinado por:

```sql
SELECT valor 
FROM preco_exame 
WHERE exame_id = $1 
  AND convenio_id = $2 
  AND vigencia_inicio <= current_date 
  AND (vigencia_fim IS NULL OR vigencia_fim >= current_date)
ORDER BY vigencia_inicio DESC 
LIMIT 1;
```

- Se não houver preço específico, usa `exames.valor` como fallback
- Cada mudança de preço cria **novo registro** (não update)
- Histórico completo preservado para auditoria

### 4.3 Snapshot Histórico

| Tabela | Tipo | O que persiste |
|--------|------|---------------|
| `atendimentos` | Snapshot | `paciente_nome`, `exame_nome` (não FK, texto) no momento do atendimento |
| `atendimento_exames` | Snapshot | `exame_nome` como texto, `valor_unitário` como número |
| `agendamentos` | Snapshot | `exames_solicitados` como JSON com nomes e valores |

**Regra**: Sempre que um registro depende de outro no momento do atendimento, armazenar como texto/JSON, não como FK.

---

## 5. Regra para Particular

**Problema**: Como identificar "particular" sem usar ID fixo hardcoded?

**Solução**:

1. Na primeira execução do schema, criar registro:
   ```sql
   INSERT INTO convenios (nome, ativo) VALUES ('PARTICULAR', true);
   ```

2. No sync, quando PCLAB enviar atendimento sem convênio ou com convênio "particular":
   ```sql
   SELECT id FROM convenios WHERE nome = 'PARTICULAR' LIMIT 1;
   ```

3. **Nunca** usar `convenio_id = '1'` ou qualquer ID mágico — usar busca por nome.

---

## 6. Alertas Objetivos Antes de Execução

### ⚠️ Crítico

- [ ] PostgreSQL precisa da extensão `unaccent` — verificar se `contrib` está instalado
- [ ] Host do PostgreSQL precisa ser acessível pelo n8n — testar conectividade antes
- [ ] API PCLAB precisa retornar dados estruturados conforme esperado — validar schema JSON

### ⚠️ Atenção

- [ ] Primeira execução pode demorar (backfill 30 dias) — monitorar logs
- [ ] Sync não deve rodar em paralelo — garantir scheduler do n8n não sobrepõe execuções
- [ ] Reconciliation view precisa de dados em ambas as tabelas — não rodar antes do primeiro sync

### ℹ️ Boas Práticas

- [ ] Criar usuário dedicado para o sync no PostgreSQL (não usar root)
- [ ] Configurar retenção de `sync_log` (ex: 90 dias) para evitar crescimento无限
- [ ] Monitorar dashboard financeiro via view `v_dashboard_financeiro`
- [ ] Testar recuperação de falha: parar sync no meio e verificar se retoma corretamente

---

## 7. Glossário de Termos

| Termo | Definição |
|-------|-----------|
| Sync | Processo de importação de dados da PCLAB para o PostgreSQL |
| Polling | Verificação periódica (agendada) vs. webhook (tempo real) |
| Checkpoint | Registro do estado do último sync para retomar de onde parou |
| Buffer | Tempo extra na janela de sync para evitar perdas em borda |
| Reconciliação | Comparação entre agendamentos e atendimentos realizados |
| Source of truth | Fonte autoritativa de um dado (ex: PCLAB para valor_total) |
| Upsert | INSERT ou UPDATE dependendo se registro existe |

---

*Documento gerado em 07/04/2026 | Bio Análise — Decisões Técnicas v1.0*