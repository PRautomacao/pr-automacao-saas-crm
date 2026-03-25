-- ============================================================
-- BIO ANÁLISE — Supabase Schema
-- Cole este script no SQL Editor do Supabase e execute.
-- Dashboard → SQL Editor → New query → Cole → Run
-- ============================================================

-- Pacientes
create table if not exists pacientes (
  id text primary key,
  nome text not null,
  sexo text,
  nascimento date,
  telefone text,
  convenio text,
  ultimo_atendimento date,
  observacoes text,
  status text default 'ativo',
  created_at timestamptz default now()
);

-- Exames / Serviços
create table if not exists exames (
  id text primary key,
  codigo text,
  nome text not null,
  tipo text,
  convenio text,
  valor numeric(10,2),
  status text default 'ativo',
  observacoes text,
  created_at timestamptz default now()
);

-- Funcionários
create table if not exists funcionarios (
  id text primary key,
  nome text not null,
  cargo text,
  login text unique,
  permissao text default 'atendente',
  status text default 'ativo',
  data_admissao date,
  observacoes text,
  created_at timestamptz default now()
);

-- Atendimentos
create table if not exists atendimentos (
  id text primary key,
  patient_id text references pacientes(id) on delete set null,
  nome_paciente text,
  data date,
  atendente text,
  exame text,
  convenio text,
  valor_total numeric(10,2) default 0,
  valor_pago numeric(10,2) default 0,
  desconto numeric(10,2) default 0,
  acrescimo numeric(10,2) default 0,
  devedor numeric(10,2) default 0,
  forma_pagamento text,
  parcelas int default 1,
  situacao text default 'pendente',
  data_entrega date,
  observacoes text,
  login_paciente text,
  senha_paciente text,
  qr_code_url text,
  created_at timestamptz default now()
);

-- Caixa (Fluxo Financeiro)
create table if not exists caixa (
  id text primary key,
  data date not null,
  tipo text not null,
  patient_id text,
  paciente text,
  servico text,
  valor numeric(10,2) default 0,
  forma text,
  parcelas int default 1,
  atendente text,
  obs text,
  created_at timestamptz default now()
);

-- Configurações do sistema
create table if not exists config (
  id int primary key default 1,
  dados jsonb not null default '{}'
);

-- ============================================================
-- Row Level Security
-- Permite acesso via anon key (ajuste depois conforme necessário)
-- ============================================================
alter table pacientes enable row level security;
alter table exames enable row level security;
alter table funcionarios enable row level security;
alter table atendimentos enable row level security;
alter table caixa enable row level security;
alter table config enable row level security;

drop policy if exists "allow all" on pacientes;
drop policy if exists "allow all" on exames;
drop policy if exists "allow all" on funcionarios;
drop policy if exists "allow all" on atendimentos;
drop policy if exists "allow all" on caixa;
drop policy if exists "allow all" on config;

create policy "allow all" on pacientes    for all using (true) with check (true);
create policy "allow all" on exames       for all using (true) with check (true);
create policy "allow all" on funcionarios for all using (true) with check (true);
create policy "allow all" on atendimentos for all using (true) with check (true);
create policy "allow all" on caixa        for all using (true) with check (true);
create policy "allow all" on config       for all using (true) with check (true);
