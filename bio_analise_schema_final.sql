-- ============================================================
-- BIO ANÁLISE — Schema Final PostgreSQL
-- Executar no PostgreSQL (não Supabase gerenciado)
-- ============================================================

-- ============================================================
-- EXTENSÕES
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "unaccent";

-- ============================================================
-- TABELAS MESTRAS (dados de referência)
-- ============================================================

-- Convênios (mestre de convênios)
create table if not exists convenios (
    id              uuid default uuid_generate_v4() primary key,
    nome            text not null unique,
    nome_normalizado text generated always as (unaccent(lower(nome))) stored,
    ativo           boolean default true,
    observacoes     text,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

-- Exames (mestre de serviços/exames)
create table if not exists exames (
    id                  uuid default uuid_generate_v4() primary key,
    codigo              text unique,              -- código interno PCLAB
    nome                text not null,
    nome_normalizado    text generated always as (unaccent(lower(nome))) stored,
    aliases             text[],                   -- nomes alternativos para busca
    categoria           text,                      -- sangue, urina, imagem, etc.
    ativo               boolean default true,
    pode_cotar_whatsapp boolean default true,      -- se pode exibir preço no bot
    restrito            boolean default false,    -- não cotar via bot
    preparo             text,                      -- instruções de preparo
    prazo_entrega       text,                      -- prazo de entrega
    precisa_agendamento boolean default false,     -- exige agendamento prévio
    precisa_jejum       boolean default false,
    horas_jejum        integer,
    observacoes         text,
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

-- Preços de exames por convênio
create table if not exists preco_exame (
    id              uuid default uuid_generate_v4() primary key,
    exame_id        uuid references exames(id) on delete cascade,
    convenio_id     uuid references convenios(id) on delete cascade,
    valor           numeric(10,2) not null,
    vigencia_inicio date not null default current_date,
    vigencia_fim    date,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now(),
    unique(exame_id, convenio_id, vigencia_inicio)
);

-- Pacientes (mestre de pacientes)
create table if not exists pacientes (
    id                  uuid default uuid_generate_v4() primary key,
    cpf                 text unique,
    nome                text not null,
    nome_normalizado    text generated always as (unaccent(lower(nome))) stored,
    sexo                text check (sexo in ('M', 'F', 'O')),
    nascimento          date,
    telefone            text,
    telefone_normalizado text generated always as (replace(replace(replace(replace(telefone, '+', ''), '(', ''), ')', ''), '-', '')) stored,
    email               text,
    endereco            text,
    bairro              text,
    cidade              text,
    uf                  text check (uf in ('GO', 'MT', 'MS', 'DF', 'SP', 'OUTROS')),
    observacoes         text,
    status              text default 'ativo' check (status in ('ativo', 'inativo', 'bloqueado')),
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

-- Funcionários/Atendentes
create table if not exists funcionarios (
    id              uuid default uuid_generate_v4() primary key,
    nome            text not null,
    login           text unique not null,
    cargo           text default 'atendente',
    permissao       text default 'atendente' check (permissao in ('admin', 'atendente', 'triagem')),
    email           text,
    telefone        text,
    ativo           boolean default true,
    data_admissao   date,
    data_demissao   date,
    observacoes     text,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

-- ============================================================
-- TABELAS TRANSACIONAIS
-- ============================================================

-- Atendimentos (atualizações da PCLAB via sync)
create table if not exists atendimentos (
    id                  uuid default uuid_generate_v4() primary key,
    pclab_id            text unique,              -- ID do atendimento na PCLAB
    paciente_id         uuid references pacientes(id) on delete set null,
    paciente_nome       text,                     -- snapshot nome no momento
    data_atendimento    date not null,
    hora_atendimento    time,
    atendente_id        uuid references funcionarios(id) on delete set null,
    tipo_atendimento    text default 'particular' check (tipo_atendimento in ('particular', 'convenio', 'plano')),
    convenios_id        uuid references convenios(id) on delete set null,
    valor_total         numeric(10,2) default 0, -- source of truth: PCLAB
    valor_pago          numeric(10,2) default 0,
    desconto            numeric(10,2) default 0,
    acrescimo           numeric(10,2) default 0,
    devedor             numeric(10,2) default 0,
    forma_pagamento     text,                     -- DINHEIRO, PIX, CARTÃO, BOLETO
    parcelas            integer default 1,
    status_financeiro   text default 'pendente' check (status_financeiro in ('pendente', 'pago', 'parcial', 'cancelado')),
    situacao            text default 'realizado' check (situacao in ('agendado', 'confirmado', 'realizado', 'cancelado', 'nao_Compareceu')),
    data_entrega        date,
    login_paciente      text,
    senha_paciente      text,
    qr_code_url         text,
    observacoes         text,
    sync_hash           text,                     -- hash para detectar mudanças
    source              text default 'pclab',     -- pclab, manual, whatsapp
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

-- Itens do atendimento (exames realizados)
create table if not exists atendimento_exames (
    id                  uuid default uuid_generate_v4() primary key,
    atendimento_id      uuid references atendimentos(id) on delete cascade,
    exame_id            uuid references exames(id) on delete set null,
    exame_nome          text,                     -- snapshot nome
    quantidade          integer default 1,
    valor_unitario      numeric(10,2) not null,
    valor_total         numeric(10,2) not null,
    created_at          timestamptz default now(),
    unique(atendimento_id, exame_id)
);

-- Agendamentos
create table if not exists agendamentos (
    id                  uuid default uuid_generate_v4() primary key,
    pclab_id            text,                    -- ID do agendamento na PCLAB (se existir)
    paciente_id         uuid references pacientes(id) on delete set null,
    paciente_nome       text,
    telefone            text,
    canal               text default 'whatsapp' check (canal in ('whatsapp', 'presencial', 'telefone', 'app')),
    tipo_coleta         text default 'presencial' check (tipo_coleta in ('presencial', 'domiciliar')),
    endereco_coleta     text,
    data_preferida      date not null,
    horario_preferido   time,
    exames_solicitados  jsonb default '[]',     -- array de {exame_id, nome, valor}
    total_estimado      numeric(10,2),
    convenios_id        uuid references convenios(id) on delete set null,
    status              text default 'solicitado' check (status in ('solicitado', 'confirmado', 'realizado', 'cancelado', 'nao_compareceu', 'reagendar')),
    observacoes         text,
    source              text default 'whatsapp', -- whatsapp, pclab, manual
    sync_hash           text,
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

-- ============================================================
-- TABELAS DE CONTROLE
-- ============================================================

-- Log de execução do sync
create table if not exists sync_log (
    id                  uuid default uuid_generate_v4() primary key,
    sync_type           text not null,           -- pclab_atendimentos, pclab_pacientes, etc.
    started_at          timestamptz not null,
    finished_at         timestamptz,
    status              text default 'running' check (status in ('running', 'success', 'failed', 'partial')),
    records_processed  integer default 0,
    records_created    integer default 0,
    records_updated    integer default 0,
    records_skipped    integer default 0,
    errors              jsonb default '[]',
    checkpoint         jsonb,                    -- estado para retomar
    created_at          timestamptz default now()
);

-- Checkpoint do sync incremental
create table if not exists sync_checkpoint (
    id                  uuid default uuid_generate_v4() primary key,
    sync_type           text not null unique,
    last_sync_start     timestamptz,
    last_sync_end       timestamptz,
    last_record_ts      timestamptz,
    last_record_id      text,
    window_start        timestamptz,              -- janela de sync (início)
    window_end          timestamptz,              -- janela de sync (fim)
    config              jsonb default '{}',
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

-- Exames
create index if not exists idx_exames_nome_normalizado on exames (nome_normalizado);
create index if not exists idx_exames_categoria on exames (categoria);
create index if not exists idx_exames_ativo on exames (ativo);

-- Pacientes
create index if not exists idx_pacientes_telefone_normalizado on pacientes (telefone_normalizado);
create index if not exists idx_pacientes_cpf on pacientes (cpf);
create index if not exists idx_pacientes_nome_normalizado on pacientes (nome_normalizado);

-- Preço exame
create index if not exists idx_preco_exame_exame on preco_exame (exame_id);
create index if not exists idx_preco_exame_convenio on preco_exame (convenio_id);
create index if not exists idx_preco_exame_vigencia on preco_exame (vigencia_inicio, vigencia_fim);

-- Atendimentos
create index if not exists idx_atendimentos_pclab_id on atendimentos (pclab_id);
create index if not exists idx_atendimentos_paciente_id on atendimentos (paciente_id);
create index if not exists idx_atendimentos_data on atendimentos (data_atendimento);
create index if not exists idx_atendimentos_status_financeiro on atendimentos (status_financeiro);
create index if not exists idx_atendimentos_situacao on atendimentos (situacao);
create index if not exists idx_atendimentos_source on atendimentos (source);

-- Atendimento exames
create index if not exists idx_atendimento_exames_atendimento on atendimento_exames (atendimento_id);
create index if not exists idx_atendimento_exames_exame on atendimento_exames (exame_id);

-- Agendamentos
create index if not exists idx_agendamentos_paciente_id on agendamentos (paciente_id);
create index if not exists idx_agendamentos_data_preferida on agendamentos (data_preferida);
create index if not exists idx_agendamentos_status on agendamentos (status);
create index if not exists idx_agendamentos_telefone on agendamentos (telefone);

-- Sync log
create index if not exists idx_sync_log_started on sync_log (started_at);
create index if not exists idx_sync_log_sync_type on sync_log (sync_type);

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Normalização de texto para busca
create or replace function fn_normalizar_texto(texto text)
returns text as $$
begin
    return lower(unaccent(trim(texto));
end;
$$ language plpgsql immutable;

-- Verificar se preço vigente existe para exame+convênio
create or replace function fn_get_preco_exame(p_exame_id uuid, p_convenio_id uuid)
returns numeric as $$
declare
    v_valor numeric;
begin
    select pe.valor into v_valor
    from preco_exame pe
    where pe.exame_id = p_exame_id
      and pe.convenio_id = p_convenio_id
      and pe.vigencia_inicio <= current_date
      and (pe.vigencia_fim is null or pe.vigencia_fim >= current_date)
    order by pe.vigencia_inicio desc
    limit 1;

    if v_valor is null then
        select e.valor into v_valor
        from exames e
        where e.id = p_exame_id;
    end if;

    return v_valor;
end;
$$ language plpgsql;

-- Buscar paciente por telefone (normalizado)
create or replace function fn_buscar_paciente_por_telefone(p_telefone text)
returns uuid as $$
declare
    v_normalizado text;
    v_paciente_id uuid;
begin
    v_normalizado = replace(replace(replace(replace(p_telefone, '+', ''), '(', ''), ')', ''), '-', '');
    
    select id into v_paciente_id
    from pacientes
    where replace(replace(replace(replace(telefone, '+', ''), '(', ''), ')', ''), '-', '') = v_normalizado
    limit 1;

    return v_paciente_id;
end;
$$ language plpgsql;

-- Hash para detecção de mudanças
create or replace function fn_compute_sync_hash(p_row jsonb)
returns text as $$
begin
    return md5(p_row::text);
end;
$$ language plpgsql immutable;

-- ============================================================
-- TRIGGERS DE UPDATED_AT
-- ============================================================

create or replace function fn_trigger_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Aplicar em todas as tabelas que têm updated_at
create trigger trg_updated_at
    before update on exames
    for each row execute function fn_trigger_updated_at();

create trigger trg_updated_at
    before update on pacientes
    for each row execute function fn_trigger_updated_at();

create trigger trg_updated_at
    before update on convenios
    for each row execute function fn_trigger_updated_at();

create trigger trg_updated_at
    before update on preco_exame
    for each row execute function fn_trigger_updated_at();

create trigger trg_updated_at
    before update on funcionarios
    for each row execute function fn_trigger_updated_at();

create trigger trg_updated_at
    before update on atendimentos
    for each row execute function fn_trigger_updated_at();

create trigger trg_updated_at
    before update on agendamentos
    for each row execute function fn_trigger_updated_at();

create trigger trg_updated_at
    before update on sync_checkpoint
    for each row execute function fn_trigger_updated_at();

-- ============================================================
-- CONVENIO PADRÃO "PARTICULAR"
-- ============================================================

do $$
begin
    insert into convenios (nome, ativo)
    values ('PARTICULAR', true)
    on conflict (nome) do nothing;
end $$;

-- ============================================================
-- VIEW: Dashboard Financeiro
-- ============================================================

create or replace view v_dashboard_financeiro as
select 
    date_trunc('day', a.data_atendimento) as dia,
    count(*) as total_atendimentos,
    sum(a.valor_total) as receita_bruta,
    sum(a.valor_pago) as receita_recebida,
    sum(a.devedor) as receivable,
    count(*) filter (where a.status_financeiro = 'pago') as atendimentos_pagos,
    count(*) filter (where a.status_financeiro in ('pendente', 'parcial')) as atendimentos_pendentes,
    count(*) filter (where a.status_financeiro = 'cancelado') as atendimentos_cancelados
from atendimentos a
where a.data_atendimento >= current_date - interval '90 days'
group by date_trunc('day', a.data_atendimento)
order by dia desc;

-- ============================================================
-- VIEW: Dashboard de Agendamentos
-- ============================================================

create or replace view v_dashboard_agendamentos as
select 
    date_trunc('day', a.data_preferida) as dia,
    count(*) as total_agendamentos,
    count(*) filter (where a.status = 'solicitado') as solicitados,
    count(*) filter (where a.status = 'confirmado') as confirmados,
    count(*) filter (where a.status = 'realizado') as realizados,
    count(*) filter (where a.status = 'cancelado') as cancelados,
    count(*) filter (where a.status = 'nao_compareceu') as nao_compareceu,
    count(*) filter (where a.tipo_coleta = 'domiciliar') as domiciliares,
    sum(a.total_estimado) as valor_estimado
from agendamentos a
where a.data_preferida >= current_date - interval '30 days'
group by date_trunc('day', a.data_preferida)
order by dia desc;

-- ============================================================
-- VIEW: Exames mais solicitados
-- ============================================================

create or replace view v_exames_mais_solicitados as
select 
    e.id,
    e.nome,
    e.categoria,
    count(ae.id) as total_solicitado,
    sum(ae.valor_total) as receita_total
from exames e
join atendimento_exames ae on ae.exame_id = e.id
join atendimentos a on a.id = ae.atendimento_id
where a.data_atendimento >= current_date - interval '90 days'
group by e.id, e.nome, e.categoria
order by total_solicitado desc
limit 20;

-- ============================================================
-- VIEW: Reconciliação agendamentos vs atendimentos
-- ============================================================

create or replace view v_reconciliacao_agendamento_atendimento as
select 
    a.id as agendamento_id,
    a.paciente_nome,
    a.data_preferida,
    a.status as status_agendamento,
    at.id as atendimento_id,
    at.data_atendimento,
    at.situacao,
    case 
        when at.id is not null then 'OK'
        when a.status = 'realizado' then 'FALTA_ATENDIMENTO'
        when a.status in ('solicitado', 'confirmado') and a.data_preferida < current_date then 'PENDENTE_ATRASADO'
        else 'PENDENTE'
    end as status_reconciliacao
from agendamentos a
left join atendimentos at on 
    at.paciente_id = a.paciente_id 
    and at.data_atendimento = a.data_preferida
    and at.situacao = 'realizado'
where a.data_preferida >= current_date - interval '30 days'
order by a.data_preferida desc;

-- ============================================================
-- VIEW: Pacientes por convênio
-- ============================================================

create or replace view v_pacientes_por_convenio as
select 
    c.nome as convenios_nome,
    count(distinct a.paciente_id) as total_pacientes,
    sum(a.valor_total) as receita_total,
    count(*) as total_atendimentos
from convenios c
left join atendimentos a on a.convenios_id = c.id 
    and a.data_atendimento >= current_date - interval '90 days'
group by c.nome
order by receita_total desc;

-- ============================================================
-- COMENTÁRIOS
-- ============================================================

comment on table exames is 'Mestre de exames/serviços. Fonte: PCLAB sync.';
comment on table pacientes is 'Mestre de pacientes. Fonte: PCLAB sync +WhatsApp bot.';
comment on table convenios is 'Mestre de convênios. Inclui PARTICULAR como padrão.';
comment on table preco_exame is 'Preços vigentes por exame e convênio. Histórico.';
comment on table atendimentos is 'Atendimentos realizados. Source of truth: PCLAB.';
comment on table agendamentos is 'Agendamentos solicitados. Fonte: WhatsApp bot + PCLAB.';
comment on table sync_log is 'Log de execução dos jobs de sync.';
comment on table sync_checkpoint is 'Checkpoint para sync incremental seguro.';
comment on view v_dashboard_financeiro is 'Receita diária últimos 90 dias.';
comment on view v_dashboard_agendamentos is 'Agendamentos diários últimos 30 dias.';
comment on view v_exames_mais_solicitados is 'Top 20 exames por volume e receita.';
comment on view v_reconciliacao_agendamento_atendimento is 'Alinhamento agendamento x atendimento realizado.';