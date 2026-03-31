-- ═══════════════════════════════════════════════════════════
--  BIO ANÁLISE — Migration: tabela agendamentos
--  Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS agendamentos (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id   TEXT        UNIQUE,           -- conversation_id do atendimento (dedup)
  nome_paciente     TEXT        NOT NULL,
  telefone          TEXT,
  canal             TEXT        DEFAULT 'whatsapp' CHECK (canal IN ('whatsapp', 'presencial')),
  tipo_coleta       TEXT        DEFAULT 'presencial' CHECK (tipo_coleta IN ('presencial', 'domiciliar')),
  data_preferida    DATE,
  horario_preferido TIME,
  exames            JSONB       DEFAULT '[]',     -- array de objetos {id, nome, valor}
  exames_nomes      TEXT,                         -- string legível: "Hemograma, TSH"
  total             NUMERIC(10,2),
  convenio          TEXT,
  status            TEXT        DEFAULT 'pendente'
                                CHECK (status IN ('pendente','confirmado','realizado','cancelado')),
  observacoes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_agendamentos_status        ON agendamentos (status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_canal         ON agendamentos (canal);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_pref     ON agendamentos (data_preferida);
CREATE INDEX IF NOT EXISTS idx_agendamentos_nome_paciente ON agendamentos (nome_paciente);
CREATE INDEX IF NOT EXISTS idx_agendamentos_created_at    ON agendamentos (created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_agendamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agendamentos_updated_at ON agendamentos;
CREATE TRIGGER trg_agendamentos_updated_at
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION update_agendamentos_updated_at();

-- RLS: somente usuários autenticados leem/escrevem
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agendamentos_select" ON agendamentos
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "agendamentos_insert" ON agendamentos
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "agendamentos_update" ON agendamentos
  FOR UPDATE USING (auth.role() IN ('authenticated', 'service_role'));

CREATE POLICY "agendamentos_delete" ON agendamentos
  FOR DELETE USING (auth.role() IN ('authenticated', 'service_role'));

-- Comentário
COMMENT ON TABLE agendamentos IS
  'Agendamentos recebidos via WhatsApp (bot n8n) e presencialmente. '
  'Populado automaticamente pelo workflow BioAnalise_Inbound_v4.1 quando '
  'o cliente confirma o agendamento (agendamento_etapa = confirmado).';
