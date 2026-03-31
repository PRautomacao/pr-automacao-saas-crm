# Bio Análise — Arquitetura de Atendimento WhatsApp v4.0
**Pereira e Lima Análise Clínica Ltda | Iporá-GO**
**Documento Técnico — Analista Sênior | n8n + Evolution API + Supabase + Chatwoot**

---

## 1. DIAGNÓSTICO TÉCNICO DO WORKFLOW ATUAL

### 1.1 Problemas Críticos Identificados

**Bug de Orçamento (raiz principal)**
O nó `Registrar_Contexto` tentava resolver a lista final de exames a partir de **quatro fontes diferentes com fallback cascata**: `safeData.exam_names_list → safeData.exames → triage.exam_names_list → conversation_context.last_exam_names_list`. O resultado é que, dependendo do caminho de execução, o mesmo pedido de orçamento gerava listas diferentes — e totais diferentes. O modelo OpenAI não cometia o erro: o problema estava **antes** da chamada LLM, na resolução dos exames.

**Bug de Agendamento (redescoberta de exames do texto)**
O `Subagente_Agendamento` tinha sua própria lógica de match de exames no catálogo rodando contra o texto cru da mensagem. Palavras como *"quero agendar amanhã"*, *"pode ser na clínica"*, *"quero ir lá"* ativavam padrões de regex que retornavam `null` ou resultados falsos positivos, e esses valores entravam como nome de exame no resumo de agendamento.

**Acoplamento excessivo entre nós**
- Funções `norm()` e `normalizeExamText()` replicadas em 6 nós diferentes (Triagem, Orquestrador, Exames, Agendamento, Processamento PDF, Processamento Imagem).
- Cada subagente tinha sua própria lógica de decisão de handoff, sem fonte única de verdade.
- Múltiplas camadas de IA (Gemini para transcrição + Gemini para visão + OpenAI para resposta) sem separação clara de responsabilidade.

**Mapeamento Chatwoot em Static Data**
Os IDs de contato e conversa do Chatwoot eram armazenados em `$getWorkflowStaticData('global')` — memória volátil que se perde em restart do workflow ou em ambiente com múltiplos workers. Isso causava criação duplicada de contatos/conversas no Chatwoot.

**Orchestration dupla**
O `Agente Orquestrador` produzia um objeto `orchestration` com `decision` e `target_agent`. O `Subagente de Triagem` já havia classificado a intenção. As duas camadas competiam, gerando inconsistências quando o orquestrador sobrescrevia a triagem.

**Ausência de snapshot congelado de orçamento**
O preço calculado era passado como variável transitória no contexto e podia ser recalculado em cada mensagem subsequente, mesmo quando o cliente não pedia novo orçamento. Basta o contexto ter mudado e o total mudava.

**Integração com painel ausente**
Não havia payload estruturado sendo enviado para o CRM/painel dos atendentes. O Chatwoot era o único canal de visibilidade — o que tornava a operação dependente do Chatwoot até para informações básicas como status de agendamento.

---

### 1.2 O Que Estava Funcionando

- Webhook Evolution API bem configurado
- Normalização de entrada (telefone, JID, tipo de mídia) — mantida com pequenos ajustes
- Fluxo Chatwoot (contato, conversa, mensagem, nota, status) — mantido e melhorado
- Download de mídia via Evolution API e envio para Gemini — mantido
- Persistência básica no Supabase — expandida
- Flag `human_active` e desvio de bot — mantido

---

## 2. NOVA ARQUITETURA PROPOSTA

### 2.1 Princípios da v4

| Princípio | Implementação |
|-----------|--------------|
| Orçamento determinístico | Preços só vêm do catálogo. LLM só redige. |
| Snapshot congelado | `budget_snapshot` criado uma vez, preservado em Supabase |
| Agendamento por formulário | Consome snapshot, nunca reparsa texto |
| Intent determinístico | Regex/keyword primeiro, LLM só para ambíguo |
| Single LLM call | Todos os agentes preparam contexto; um único nó OpenAI gera o texto |
| IDs Chatwoot no Supabase | Não mais em static data — persistência real |
| CRM nativo | Payload estruturado enviado em cada turno |
| Separação total de responsabilidades | Cada nó faz uma coisa |

### 2.2 Fluxo Principal (53 nós)

```
Webhook_Evolution
  └── Filtro_Inicial            (dedup, fromMe, grupos, msgs antigas)
        └── Config_Clinica       (config estática)
              └── Buscar_Catalogo (GET Supabase /exames)
                    └── Montar_Base
                          └── Normalizar_Entrada
                                └── Verificar_Paciente → Upsert_Paciente
                                      └── Carregar_Atendimento
                                            └── Montar_Contexto
                                                  └── If_Humano_Ativo
                                                        ├── [SIM] Sync_Humano_Saida → Preparar_Sync_Chatwoot
                                                        └── [NÃO] Router_Midia
                                                                ├── audio → Baixar_Audio → Transcrever_Audio → Aplicar_Transcricao
                                                                ├── image → Baixar_Imagem → Analisar_Imagem → Aplicar_Visao_Imagem
                                                                ├── pdf   → Baixar_PDF   → Analisar_PDF   → Aplicar_Visao_PDF
                                                                └── text  → (direto)
                                                                          └── Classificar_Intencao
                                                                                └── Router_Intencao
                                                                                      ├── institutional → Agente_Institucional
                                                                                      ├── exames_orcamento → Agente_Orcamento
                                                                                      ├── agendamento → Agente_Agendamento
                                                                                      ├── handoff → Agente_Escalonamento
                                                                                      ├── saudacao → Agente_Saudacao
                                                                                      ├── despedida → Agente_Despedida
                                                                                      └── (fallback) → Agente_Institucional
                                                                                              └── Preparar_LLM → OpenAI_Completions → Processar_LLM
                                                                                                    └── Registrar_Contexto → Salvar_Atendimento
                                                                                                          └── If_Handoff
                                                                                                                ├── [SIM] Salvar_Handoff_Supabase
                                                                                                                └── [NÃO] Enviar_Resposta_WA
                                                                                                                        └── Preparar_Sync_Chatwoot
                                                                                                                              └── If_Chatwoot_Ativo
                                                                                                                                    ├── [SIM] If_Tem_Conversa
                                                                                                                                    │           ├── [SIM] Chatwoot_Msg_Cliente
                                                                                                                                    │           └── [NÃO] Criar_Contato → Criar_Conversa → Salvar_IDs
                                                                                                                                    │                         └── Chatwoot_Msg_Cliente → Chatwoot_Nota_IA → Chatwoot_Status → Atualizar_IDs_Supabase
                                                                                                                                    └── [NÃO] Sync_Painel_CRM → Saida_Final
```

---

## 3. TABELAS SUPABASE NECESSÁRIAS

### 3.1 Tabela `exames` (existente — confirmar campos)

```sql
CREATE TABLE IF NOT EXISTS public.exames (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                 TEXT NOT NULL,
  aliases              TEXT[],            -- nomes alternativos para matching
  categoria            TEXT,
  valor                NUMERIC(10,2),
  convenio             TEXT,
  preparo              TEXT,
  prazo_entrega        TEXT,
  precisa_agendamento  BOOLEAN DEFAULT false,
  precisa_jejum        BOOLEAN DEFAULT false,
  horas_jejum          INTEGER,
  pode_cotar_whatsapp  BOOLEAN DEFAULT true,
  restrito             BOOLEAN DEFAULT false,  -- não cotar via bot
  ativo                BOOLEAN DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON public.exames (ativo);
CREATE INDEX ON public.exames (nome);
```

### 3.2 Tabela `pacientes`

```sql
CREATE TABLE IF NOT EXISTS public.pacientes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone    TEXT UNIQUE NOT NULL,
  nome        TEXT,
  canal       TEXT DEFAULT 'whatsapp',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX ON public.pacientes (telefone);
```

### 3.3 Tabela `atendimentos`

```sql
CREATE TABLE IF NOT EXISTS public.atendimentos (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id          TEXT UNIQUE NOT NULL,  -- 'wa_5564XXXXXXXX'
  paciente_id              UUID REFERENCES public.pacientes(id),
  telefone                 TEXT,
  canal                    TEXT DEFAULT 'whatsapp',
  status                   TEXT DEFAULT 'active',
  owner                    TEXT DEFAULT 'bot',
  human_active             BOOLEAN DEFAULT false,
  handoff_required         BOOLEAN DEFAULT false,
  handoff_category         TEXT,
  last_intent              TEXT,
  last_message             TEXT,
  last_response            TEXT,
  -- Orçamento snapshot
  budget_mode_active       BOOLEAN DEFAULT false,
  budget_exam_names        TEXT[],
  budget_total             NUMERIC(10,2),
  budget_payment_type      TEXT,
  budget_snapshot          JSONB,
  -- Agendamento
  agendamento_etapa        TEXT,
  agendamento_nome         TEXT,
  agendamento_telefone     TEXT,
  tipo_coleta              TEXT,
  endereco_coleta          TEXT,
  data_preferida           TEXT,
  horario_preferido        TEXT,
  agendamento_resumo       JSONB,
  -- Chatwoot IDs (não mais em static data)
  chatwoot_contact_id      TEXT,
  chatwoot_conversation_id TEXT,
  -- Contexto completo serializado
  contexto                 JSONB,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX ON public.atendimentos (conversation_id);
CREATE INDEX ON public.atendimentos (telefone);
CREATE INDEX ON public.atendimentos (status);
CREATE INDEX ON public.atendimentos (human_active);
```

### 3.4 Tabela `handoffs`

```sql
CREATE TABLE IF NOT EXISTS public.handoffs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  TEXT NOT NULL,
  paciente_id      UUID REFERENCES public.pacientes(id),
  telefone         TEXT,
  canal            TEXT DEFAULT 'whatsapp',
  categoria        TEXT,       -- restricted_exam, complaint, human_request, etc.
  motivo           TEXT,
  status           TEXT DEFAULT 'pending',  -- pending, in_progress, resolved
  atendente        TEXT,       -- Adriana, Kaleb, Cida
  contexto_resumo  JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);
CREATE INDEX ON public.handoffs (conversation_id);
CREATE INDEX ON public.handoffs (status);
```

### 3.5 Tabela `agendamentos` (para o painel)

```sql
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  TEXT NOT NULL,
  paciente_id      UUID REFERENCES public.pacientes(id),
  paciente_nome    TEXT,
  telefone         TEXT,
  canal            TEXT DEFAULT 'whatsapp',
  tipo_coleta      TEXT,       -- clinica | domiciliar
  endereco_coleta  TEXT,
  data_preferida   TEXT,
  horario_preferido TEXT,
  exames           JSONB,      -- array de { nome, valor }
  total            NUMERIC(10,2),
  payment_type     TEXT,
  status           TEXT DEFAULT 'solicitado',  -- solicitado, confirmado, cancelado, realizado
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON public.agendamentos (conversation_id);
CREATE INDEX ON public.agendamentos (status);
CREATE INDEX ON public.agendamentos (data_preferida);
```

### 3.6 RLS (Row Level Security)
```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE public.pacientes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimentos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handoffs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos  ENABLE ROW LEVEL SECURITY;

-- Service role tem acesso total (n8n usa service role key)
CREATE POLICY "service_role_all" ON public.pacientes    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON public.atendimentos FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON public.handoffs     FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON public.agendamentos FOR ALL USING (auth.role() = 'service_role');
```

---

## 4. REGRAS DE CONTEXTO (conversation_context)

O contexto é carregado do Supabase a cada mensagem, preservando o estado completo da conversa:

```json
{
  "paciente_id":              "uuid",
  "paciente_nome":            "Nome do Paciente",
  "conversation_id":          "wa_5564XXXXXXXX",
  "last_intent":              "exames_orcamento",
  "current_status":           "awaiting_customer",
  "current_owner":            "bot",
  "human_active":             false,
  "handoff_required":         false,
  "handoff_category":         null,
  "collect_field":            null,

  "budget_mode_active":       true,
  "budget_exam_names_list":   ["Hemograma Completo", "Glicemia"],
  "budget_resolved_exams":    [{ "id": "...", "nome": "Hemograma Completo", "valor": 35.00 }],
  "budget_total_snapshot":    75.00,
  "budget_payment_type":      "particular",
  "budget_snapshot":          {
    "exams": [...],
    "total": 75.00,
    "payment_type": "particular",
    "frozen_at": "2025-01-15T10:30:00Z"
  },

  "agendamento_etapa":        "collect_date",
  "agendamento_nome":         "Maria Silva",
  "agendamento_telefone":     "+556498459XXXX",
  "agendamento_resumo":       null,
  "tipo_coleta":              "clinica",
  "endereco_coleta":          null,
  "data_preferida":           null,
  "horario_preferido":        null,

  "chatwoot_contact_id":      "42",
  "chatwoot_conversation_id": "87",
  "convenio_nome":            null,

  "last_exam_names_list":     ["Hemograma Completo", "Glicemia"],
  "last_quoted_exams":        [...],
  "message_count":            5,
  "history": [
    { "user": "Quero fazer um hemograma", "assistant": "Claro! O hemograma completo custa R$ 35,00...", "ts": "..." }
  ]
}
```

---

## 5. ESTRATÉGIA DE INTEGRAÇÃO COM CHATWOOT

### 5.1 Mudanças Principais
- **IDs de contato e conversa** agora são armazenados em `atendimentos.chatwoot_contact_id` e `atendimentos.chatwoot_conversation_id` no Supabase — não mais em `$getWorkflowStaticData`.
- A cada requisição, os IDs são carregados no `Montar_Contexto`.
- Se existem IDs → usa-os diretamente para postar mensagens.
- Se não existem → cria contato → cria conversa → salva IDs no Supabase.

### 5.2 Fluxo Chatwoot por Turno

```
Preparar_Sync_Chatwoot
  → If_Chatwoot_Ativo (verifica env vars)
      ├── [ATIVO] If_Tem_Conversa (verifica chatwoot_conversation_id no ctx)
      │       ├── [SIM] → Chatwoot_Msg_Cliente (mensagem incoming)
      │       │               → Chatwoot_Nota_IA (nota privada com resposta do bot)
      │       │               → Chatwoot_Status (open | pending se handoff)
      │       │               → Atualizar_IDs_Supabase
      │       └── [NÃO] → Criar_Contato_Chatwoot
      │                       → Criar_Conversa_Chatwoot
      │                       → Salvar_IDs_Chatwoot (node code — lê IDs criados)
      │                       → Chatwoot_Msg_Cliente → ... (igual ao SIM)
      └── [INATIVO] → Sync_Painel_CRM → Saida_Final
```

### 5.3 Handoff Humano
- Quando `handoff = true`: `Chatwoot_Status` define status `pending` — o Chatwoot sinaliza para a equipe.
- Quando `human_active = true` (atendente assumiu no Chatwoot): o bot detecta na próxima mensagem via `If_Humano_Ativo` e só espelha a mensagem no Chatwoot sem responder.
- Para reativar o bot: atendente pode atualizar `human_active = false` via endpoint do painel ou diretamente no Supabase.

### 5.4 Variáveis de Ambiente Chatwoot

| Variável | Descrição |
|----------|-----------|
| `CHATWOOT_BASE_URL` | URL base ex: `https://chatwoot.seudominio.com` |
| `CHATWOOT_ACCOUNT_ID` | ID da conta |
| `CHATWOOT_INBOX_ID` | ID do inbox WhatsApp |
| `CHATWOOT_API_TOKEN` | Token de acesso da API |

---

## 6. ESTRATÉGIA DE INTEGRAÇÃO COM O PAINEL / CRM

### 6.1 Payload CRM (enviado a cada turno)

O nó `Sync_Painel_CRM` faz `POST` para `$env.CRM_WEBHOOK_URL` com o payload `crm_payload`:

```json
{
  "event": "atendimento_atualizado",
  "conversation_id": "wa_5564XXXXXXXX",
  "paciente": {
    "id": "uuid",
    "nome": "Maria Silva",
    "telefone": "5564XXXXXXXX",
    "canal": "whatsapp"
  },
  "atendimento": {
    "status": "answered_by_ai",
    "owner": "bot",
    "human_active": false,
    "last_intent": "exames_orcamento",
    "intencao": "exames_orcamento",
    "handoff": false,
    "handoff_category": null
  },
  "orcamento": {
    "exames": ["Hemograma Completo", "Glicemia"],
    "total": 75.00,
    "tipo_pagamento": "particular",
    "snapshot": { "exams": [...], "total": 75.00, "frozen_at": "..." }
  },
  "agendamento": {
    "etapa": "collect_date",
    "nome": "Maria Silva",
    "tipo_coleta": "clinica",
    "endereco": null,
    "data": null,
    "horario": null,
    "resumo": null
  },
  "chatwoot": {
    "contact_id": "42",
    "conversation_id": "87"
  },
  "ts": "2025-01-15T10:30:00Z"
}
```

### 6.2 Variáveis de Ambiente CRM

| Variável | Descrição |
|----------|-----------|
| `CRM_WEBHOOK_URL` | URL do endpoint do painel que recebe eventos |
| `CRM_WEBHOOK_SECRET` | Secret para autenticação do webhook |

### 6.3 Campos Mínimos que o Painel deve Receber

O painel web dos atendentes deve indexar os dados do Supabase nas tabelas `atendimentos`, `handoffs` e `agendamentos`. Os atendentes precisam visualizar:

- Identificação do paciente (nome, telefone, canal)
- Status do atendimento (IA ou humano)
- Intenção e histórico
- Orçamento (exames, total, tipo de pagamento)
- Agendamento (etapa, exames, data/hora preferida, tipo de coleta, endereço)
- Link para a conversa no Chatwoot (`chatwoot_conversation_id`)
- Resumo final do pedido

---

## 7. FLUXO DE ORÇAMENTO CONFIÁVEL

### 7.1 Regra de Ouro
> O preço nunca é inventado. O preço vem do catálogo. O modelo só escreve a mensagem.

### 7.2 Sequência no `Agente_Orcamento`

```
1. Receber texto normalizado
2. Matchear exames no catálogo (função determinística, sem LLM)
3. Se novos exames encontrados:
   a. Se budget_mode_active = true → adicionar ao snapshot existente
   b. Se não → criar novo snapshot
4. Calcular total: reduce((sum, exam) => sum + exam.valor)
5. Congelar snapshot: { exams, total, payment_type, frozen_at }
6. Salvar snapshot em budget_snapshot no contexto
7. Passar snapshot para o LLM como dado somente-leitura
8. LLM recebe prompt: "Use EXATAMENTE esses valores, nunca invente"
9. LLM escreve a mensagem humanizada (sem calcular preço)
10. Registrar_Contexto persiste budget_snapshot no Supabase
```

### 7.3 Proteção contra Deriva
- O `Registrar_Contexto` **nunca** recalcula o total — preserva `budget_snapshot` do agente.
- Em mensagens subsequentes, o snapshot é carregado do Supabase e continuado.
- Só é zerado quando `agendamento_etapa = 'done'` (negócio concluído).

---

## 8. FLUXO DE AGENDAMENTO CONFIÁVEL

### 8.1 Regra de Ouro
> Exames no agendamento vêm do snapshot de orçamento, nunca do texto livre.

### 8.2 Sequência no `Agente_Agendamento`

```
1. Carregar exames: budget_snapshot.exams || budget_resolved_exams || last_quoted_exams
2. Se não há exames confirmados → etapa = 'collect_exams' (pede ao cliente)
3. Formulário estruturado (um campo por vez):
   - collect_name         → nome do paciente
   - collect_collection_type → clínica ou domiciliar
   - collect_address      → endereço (só se domiciliar)
   - collect_date         → data preferida
   - collect_time         → horário preferido
   - confirm              → mostrar resumo e pedir confirmação
   - done                 → registrar agendamento
4. Extração de data/hora: regex simples sobre texto, não LLM
5. LLM só redige a pergunta da próxima etapa — não decide a etapa
6. Ao done: salvar em public.agendamentos + notificar painel
```

### 8.3 Proteção contra Texto Livre Virando Exame
- Palavras como *"amanhã"*, *"na clínica"*, *"quero agendar"* são tratadas como campos do formulário.
- A lista de exames é imutável após ser carregada do snapshot.

---

## 9. VARIÁVEIS DE AMBIENTE NECESSÁRIAS

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `EVO_BASE_URL` | ✅ | URL base da Evolution API ex: `https://evo.seudominio.com` |
| `EVO_INSTANCE` | ✅ | Nome da instância no Evolution API |
| `EVO_API_KEY` | ✅ | API Key do Evolution API |
| `SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `SUPABASE_KEY` | ✅ | Service Role Key do Supabase |
| `OPENAI_API_KEY` | ✅ | Chave da API OpenAI (GPT-4o-mini) |
| `GEMINI_API_KEY` | ✅ | Chave da API Google Gemini (áudio/visão) |
| `CHATWOOT_BASE_URL` | ⚠️ | URL do Chatwoot (deixar vazio para desabilitar) |
| `CHATWOOT_ACCOUNT_ID` | ⚠️ | ID da conta Chatwoot |
| `CHATWOOT_INBOX_ID` | ⚠️ | ID do inbox WhatsApp no Chatwoot |
| `CHATWOOT_API_TOKEN` | ⚠️ | Token da API Chatwoot |
| `CRM_WEBHOOK_URL` | ⚠️ | URL do webhook do painel/CRM (opcional) |
| `CRM_WEBHOOK_SECRET` | ⚠️ | Secret do webhook CRM (opcional) |

---

## 10. O QUE FOI MANTIDO, REMOVIDO E REFEITO

### Mantido
- Webhook Evolution API (path alterado para `/bio-analise-v4`)
- Download de mídia via Evolution API
- Transcrição de áudio via Gemini
- Análise de imagem/PDF via Gemini Vision
- Fluxo de persistência Supabase
- Fluxo Chatwoot (contato, conversa, mensagem, nota, status)
- Flag `human_active` e desvio do bot
- Dados institucionais e configuração da clínica
- Catálogo de exames via Supabase

### Removido
- Agente Orquestrador (substituído pelo Classificar_Intenção)
- Subagente de Triagem (fundido com Classificar_Intenção)
- Switch Decisao (substituído por Router_Intencao)
- Mapeamento Chatwoot em static data (movido para Supabase)
- Lógica duplicada de `norm()` em 6 nós (centralizada)
- Múltiplas fontes de fallback para exames no contexto (substituído por snapshot único)
- Campos `orchestration.*` (substituído por `intent` + `agent_type`)

### Refeito
- `Agente_Orcamento`: agora usa snapshot congelado; zero tolerância para preço inventado
- `Agente_Agendamento`: consome snapshot, formulário estruturado, sem reparsar texto
- `Classificar_Intencao`: determinístico por keyword; LLM só para desempate
- `Registrar_Contexto`: schema fixo, preserva snapshots, monta payload CRM
- `Preparar_LLM`: valida se skip_llm; constrói histórico de conversa
- `Processar_LLM`: parse robusto de JSON, fallback seguro
- `Chatwoot Flow`: IDs do Supabase, sem static data
- Adicionado `Sync_Painel_CRM`: payload estruturado para o painel dos atendentes
- Adicionado `Filtro_Inicial`: filtra fromMe, grupos, msgs antigas
- Adicionado `Agente_Saudacao` e `Agente_Despedida`: respostas template, sem LLM

---

## 11. GUIA DE IMPORTAÇÃO E CONFIGURAÇÃO

### 11.1 Pré-requisitos
1. Execute os scripts SQL da seção 3 no Supabase SQL Editor
2. Popule a tabela `exames` com o catálogo da Bio Análise (nome, aliases, valor, preparo, etc.)
3. Configure todas as variáveis de ambiente no n8n (Settings → Environment Variables)
4. Certifique-se que o Evolution API está ativo com a instância configurada
5. Certifique-se que o Chatwoot tem um inbox WhatsApp configurado

### 11.2 Importação
1. No n8n: Workflows → Import from File
2. Selecione `BioAnalise_Workflow_v4.json`
3. Configure o webhook no Evolution API apontando para: `https://seu-n8n.com/webhook/bio-analise-v4`
4. Ative o workflow

### 11.3 Campo `aliases` na tabela `exames`
Para o matching de exames funcionar corretamente, adicione aliases na tabela. Exemplo:
```sql
UPDATE public.exames SET aliases = ARRAY['eas','urina simples','urina tipo 1','urina tipo i'] WHERE nome = 'Exame de Urina (EAS)';
UPDATE public.exames SET aliases = ARRAY['hemograma','hematologia'] WHERE nome = 'Hemograma Completo';
UPDATE public.exames SET aliases = ARRAY['t4l','t4 livre'] WHERE nome = 'T4 Livre';
```

---

*Documento gerado em 30/03/2026 | Versão 4.0.0 | Bio Análise - Atendimento WhatsApp*
