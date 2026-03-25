/**
 * BIO ANÁLISE — Data Module v2
 * Supabase-backed with in-memory cache.
 * Falls back to localStorage if SUPA client is null (credenciais não configuradas).
 */

const DB = (() => {

  /* ============================================================
     MODO OPERACIONAL
     - Se SUPA (supabase.js) estiver configurado → usa Supabase
     - Caso contrário → localStorage (modo desenvolvimento)
  ============================================================ */
  const USE_SUPABASE = typeof SUPA !== 'undefined' && SUPA !== null;

  const KEYS = {
    pacientes:    'ba_pacientes',
    atendimentos: 'ba_atendimentos',
    caixa:        'ba_caixa',
    exames:       'ba_exames',
    funcionarios: 'ba_funcionarios',
    config:       'ba_config',
    seeded:       'ba_seeded'
  };

  // In-memory cache (populado por init())
  const cache = {
    pacientes:    [],
    atendimentos: [],
    caixa:        [],
    exames:       [],
    funcionarios: [],
    config:       null
  };

  let _initialized = false;

  /* ============================================================
     SEED DATA
  ============================================================ */
  const DEFAULT_CONFIG = {
    clinica_nome:     'Bio Análise',
    clinica_razao:    'Pereira e Lima Análise Clínica Ltda',
    clinica_endereco: 'Av. Pará, nº 365, Centro',
    clinica_cidade:   'Iporá - GO',
    clinica_telefone: '(64) 3603-1306',
    clinica_email:    'bioanaliselab@bol.com.br',
    pclab_url:        '',
    pclab_token:      '',
    pclab_webhook:    '',
    pclab_status:     'desativado',
    tema_cor:         'azul'
  };

  const SEED_PACIENTES = [
    { id: 'P32912', nome: 'Paulo Ricardo Nascimento Marti', sexo: 'M', nascimento: '1985-04-12', telefone: '(64) 99854-3210', convenio: 'Particular', ultimo_atendimento: '2026-03-24', observacoes: '', status: 'ativo' },
    { id: 'P33001', nome: 'Maria Aparecida dos Santos',     sexo: 'F', nascimento: '1972-11-08', telefone: '(64) 99712-5544', convenio: 'Unimed',     ultimo_atendimento: '2026-03-22', observacoes: 'Hipertensa', status: 'ativo' },
    { id: 'P33042', nome: 'João Carlos Pereira Lima',       sexo: 'M', nascimento: '1990-07-25', telefone: '(64) 99630-1188', convenio: 'Particular', ultimo_atendimento: '2026-03-20', observacoes: '', status: 'ativo' },
    { id: 'P33090', nome: 'Ana Cláudia Menezes Silva',      sexo: 'F', nascimento: '2001-02-14', telefone: '(64) 99740-6671', convenio: 'SUS',         ultimo_atendimento: '2026-03-23', observacoes: '', status: 'ativo' },
    { id: 'P33110', nome: 'Carlos Eduardo Rocha',           sexo: 'M', nascimento: '1965-09-03', telefone: '(64) 99521-7782', convenio: 'Particular', ultimo_atendimento: '2026-03-18', observacoes: 'Diabético', status: 'ativo' },
    { id: 'P33145', nome: 'Fernanda Beatriz Costa',         sexo: 'F', nascimento: '1995-12-20', telefone: '(64) 99802-3349', convenio: 'Particular', ultimo_atendimento: '2026-03-24', observacoes: '', status: 'ativo' },
    { id: 'P33198', nome: 'Roberto Alves Nascimento',       sexo: 'M', nascimento: '1958-03-30', telefone: '(64) 99644-8810', convenio: 'Bradesco',   ultimo_atendimento: '2026-03-21', observacoes: '', status: 'ativo' },
    { id: 'P33210', nome: 'Luciana Ferreira Borges',        sexo: 'F', nascimento: '1988-06-17', telefone: '(64) 99573-2209', convenio: 'Particular', ultimo_atendimento: '2026-03-19', observacoes: '', status: 'ativo' },
    { id: 'P33240', nome: 'Marcos Vinícius Cardoso',        sexo: 'M', nascimento: '2005-08-04', telefone: '(64) 99490-1156', convenio: 'SUS',         ultimo_atendimento: '2026-03-15', observacoes: 'Menor de idade', status: 'ativo' },
    { id: 'P33260', nome: 'Rosangela Batista Pinto',        sexo: 'F', nascimento: '1969-01-28', telefone: '(64) 99867-4432', convenio: 'Unimed',     ultimo_atendimento: '2026-03-12', observacoes: '', status: 'inativo' }
  ];

  const SEED_EXAMES = [
    { id: 'EX001', codigo: 'HEM001', nome: 'Hemograma Completo', tipo: 'Rotina', convenio: 'Particular', valor: 25.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX002', codigo: 'URE001', nome: 'Ureia', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX003', codigo: 'CRE001', nome: 'Creatinina', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX004', codigo: 'ACU001', nome: 'Ácido Úrico', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX005', codigo: 'VDR001', nome: 'VDRL', tipo: 'Imunologia', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX006', codigo: 'EAS001', nome: 'EAS (Exame de Urina Tipo I)', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário | Obs: Não precisa ser a primeira urina do dia' },
    { id: 'EX007', codigo: 'EPF001', nome: 'EPF (Exame Parasitológico de Fezes)', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário | Obs: Pode entregar até as 14h30 de segunda a sexta-feira' },
    { id: 'EX008', codigo: 'GLI001', nome: 'Glicemia', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Mínimo de 8 horas e máximo de 12 horas' },
    { id: 'EX009', codigo: 'GRU001', nome: 'Grupo Sanguíneo', tipo: 'Rotina', convenio: 'Particular', valor: 40.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX010', codigo: 'BETA01', nome: 'Beta HCG', tipo: 'Hormônio', convenio: 'Particular', valor: 35.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX011', codigo: 'BETA02', nome: 'Beta HCG Quantitativo', tipo: 'Hormônio', convenio: 'Particular', valor: 50.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX012', codigo: 'COL001', nome: 'Colesterol Total', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Mínimo de 8 horas e máximo de 12 horas' },
    { id: 'EX013', codigo: 'TRI001', nome: 'Triglicerídeos', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Mínimo de 8 horas e máximo de 12 horas' },
    { id: 'EX014', codigo: 'LIP001', nome: 'Perfil Lipídico', tipo: 'Rotina', convenio: 'Particular', valor: 50.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Mínimo de 8 horas e máximo de 12 horas' },
    { id: 'EX015', codigo: 'GAMA01', nome: 'Gama GT', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX016', codigo: 'TGO001', nome: 'TGO (AST)', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX017', codigo: 'TGP001', nome: 'TGP (ALT)', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX018', codigo: 'FOS001', nome: 'Fosfatase Alcalina', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX019', codigo: 'FOS002', nome: 'Fósforo', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX020', codigo: 'CAL001', nome: 'Cálcio', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX021', codigo: 'MAG001', nome: 'Magnésio', tipo: 'Rotina', convenio: 'Particular', valor: 20.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX022', codigo: 'POT001', nome: 'Potássio', tipo: 'Rotina', convenio: 'Particular', valor: 25.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX023', codigo: 'SOD001', nome: 'Sódio', tipo: 'Rotina', convenio: 'Particular', valor: 25.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX024', codigo: 'CAL002', nome: 'Cálcio Iônico', tipo: 'Rotina', convenio: 'Particular', valor: 30.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX025', codigo: 'CLO001', nome: 'Cloro', tipo: 'Rotina', convenio: 'Particular', valor: 30.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX026', codigo: 'FER001', nome: 'Ferro', tipo: 'Rotina', convenio: 'Particular', valor: 30.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX027', codigo: 'CTLF01', nome: 'Capacidade Total de Ligação do Ferro (CTLF)', tipo: 'Rotina', convenio: 'Particular', valor: 30.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX028', codigo: 'PSO001', nome: 'Pesquisa de Sangue Oculto', tipo: 'Rotina', convenio: 'Particular', valor: 30.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX029', codigo: 'PRO001', nome: 'Proteínas Totais e Frações', tipo: 'Rotina', convenio: 'Particular', valor: 30.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX030', codigo: 'T30001', nome: 'T3', tipo: 'Hormônio', convenio: 'Particular', valor: 30.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX031', codigo: 'T3L001', nome: 'T3 Livre', tipo: 'Hormônio', convenio: 'Particular', valor: 30.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX032', codigo: 'T40001', nome: 'T4', tipo: 'Hormônio', convenio: 'Particular', valor: 30.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX033', codigo: 'T4L001', nome: 'T4 Livre', tipo: 'Hormônio', convenio: 'Particular', valor: 30.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX034', codigo: 'TSH001', nome: 'TSH', tipo: 'Hormônio', convenio: 'Particular', valor: 30.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX035', codigo: 'COL002', nome: 'Colinesterase', tipo: 'Rotina', convenio: 'Particular', valor: 30.00, status: 'ativo', observacoes: 'Resultado: Liberado no mesmo dia | Jejum: Não necessário' },
    { id: 'EX036', codigo: 'TES001', nome: 'Testosterona Livre', tipo: 'Hormônio', convenio: 'Particular', valor: 50.00, status: 'ativo', observacoes: 'Resultado: 4 a 5 dias úteis | Jejum: Não necessário' },
    { id: 'EX037', codigo: 'TES002', nome: 'Testosterona Total', tipo: 'Hormônio', convenio: 'Particular', valor: 50.00, status: 'ativo', observacoes: 'Resultado: 4 a 5 dias úteis | Jejum: Não necessário' },
    { id: 'EX038', codigo: 'RUB001', nome: 'Rubéola IgG', tipo: 'Imunologia', convenio: 'Particular', valor: 50.00, status: 'ativo', observacoes: 'Resultado: 4 a 5 dias úteis | Jejum: Não necessário' },
    { id: 'EX039', codigo: 'RUB002', nome: 'Rubéola IgM', tipo: 'Imunologia', convenio: 'Particular', valor: 50.00, status: 'ativo', observacoes: 'Resultado: 4 a 5 dias úteis | Jejum: Não necessário' },
    { id: 'EX040', codigo: 'TOX001', nome: 'Toxoplasmose IgG', tipo: 'Imunologia', convenio: 'Particular', valor: 50.00, status: 'ativo', observacoes: 'Resultado: 4 a 5 dias úteis | Jejum: Não necessário' },
    { id: 'EX041', codigo: 'TOX002', nome: 'Toxoplasmose IgM', tipo: 'Imunologia', convenio: 'Particular', valor: 50.00, status: 'ativo', observacoes: 'Resultado: 4 a 5 dias úteis | Jejum: Não necessário' }
  ];

  const SEED_FUNCIONARIOS = [
    { id: 'F001', nome: 'Dr. Omar',  cargo: 'Médico Responsável', login: 'omar',    permissao: 'admin',     status: 'ativo', data_admissao: '2015-01-10', observacoes: 'Responsável técnico' },
    { id: 'F002', nome: 'Adriana',   cargo: 'Atendente',          login: 'adriana', permissao: 'atendente', status: 'ativo', data_admissao: '2019-03-15', observacoes: '' },
    { id: 'F003', nome: 'Kaleb',     cargo: 'Atendente',          login: 'kaleb',   permissao: 'atendente', status: 'ativo', data_admissao: '2021-08-01', observacoes: '' },
    { id: 'F004', nome: 'Cida',      cargo: 'Atendente Sênior',   login: 'cida',    permissao: 'atendente', status: 'ativo', data_admissao: '2017-05-20', observacoes: 'Auxiliar de laboratório' }
  ];

  const SEED_ATENDIMENTOS = [
    { id: 'AT231593', patient_id: 'P32912', nome_paciente: 'Paulo Ricardo Nascimento Marti', data: '2026-03-24', atendente: 'Adriana', exame: 'Hemograma Completo',        convenio: 'Particular', valor_total: 25.00, valor_pago: 25.00, desconto: 0, acrescimo: 0, devedor: 0,     forma_pagamento: 'Pix',      parcelas: 1, situacao: 'pago',     data_entrega: '2026-03-31', observacoes: '',                       login_paciente: 'paulo.marti', senha_paciente: '****', qr_code_url: '', created_at: '2026-03-24T09:15:00' },
    { id: 'AT231594', patient_id: 'P33001', nome_paciente: 'Maria Aparecida dos Santos',     data: '2026-03-24', atendente: 'Cida',    exame: 'TSH (Tireotropina)',         convenio: 'Unimed',     valor_total: 45.00, valor_pago: 45.00, desconto: 0, acrescimo: 0, devedor: 0,     forma_pagamento: 'Cartão',   parcelas: 1, situacao: 'pago',     data_entrega: '2026-03-31', observacoes: 'Pedir retorno em 30 dias', login_paciente: '', senha_paciente: '', qr_code_url: '', created_at: '2026-03-24T09:40:00' },
    { id: 'AT231595', patient_id: 'P33145', nome_paciente: 'Fernanda Beatriz Costa',         data: '2026-03-24', atendente: 'Adriana', exame: 'Colesterol Total + Frações', convenio: 'Particular', valor_total: 32.00, valor_pago: 20.00, desconto: 0, acrescimo: 0, devedor: 12.00, forma_pagamento: 'Parcelado', parcelas: 2, situacao: 'parcial',  data_entrega: '2026-03-31', observacoes: '',                       login_paciente: '', senha_paciente: '', qr_code_url: '', created_at: '2026-03-24T10:05:00' },
    { id: 'AT231596', patient_id: 'P33042', nome_paciente: 'João Carlos Pereira Lima',       data: '2026-03-24', atendente: 'Kaleb',   exame: 'Vitamina D (25-OH)',         convenio: 'Particular', valor_total: 68.00, valor_pago: 68.00, desconto: 5, acrescimo: 0, devedor: 0,     forma_pagamento: 'Dinheiro', parcelas: 1, situacao: 'pago',     data_entrega: '2026-03-31', observacoes: 'Desconto fidelidade',    login_paciente: '', senha_paciente: '', qr_code_url: '', created_at: '2026-03-24T10:30:00' },
    { id: 'AT231597', patient_id: 'P33090', nome_paciente: 'Ana Cláudia Menezes Silva',      data: '2026-03-24', atendente: 'Cida',    exame: 'Urina Tipo I (EAS)',         convenio: 'SUS',        valor_total: 22.00, valor_pago: 22.00, desconto: 0, acrescimo: 0, devedor: 0,     forma_pagamento: 'Dinheiro', parcelas: 1, situacao: 'pago',     data_entrega: '2026-03-24', observacoes: '',                       login_paciente: '', senha_paciente: '', qr_code_url: '', created_at: '2026-03-24T11:00:00' },
    { id: 'AT231500', patient_id: 'P33110', nome_paciente: 'Carlos Eduardo Rocha',           data: '2026-03-22', atendente: 'Adriana', exame: 'Glicemia em Jejum',          convenio: 'Particular', valor_total: 18.00, valor_pago: 18.00, desconto: 0, acrescimo: 0, devedor: 0,     forma_pagamento: 'Pix',      parcelas: 1, situacao: 'pago',     data_entrega: '2026-03-22', observacoes: 'Paciente diabético',    login_paciente: '', senha_paciente: '', qr_code_url: '', created_at: '2026-03-22T08:30:00' },
    { id: 'AT231480', patient_id: 'P33198', nome_paciente: 'Roberto Alves Nascimento',       data: '2026-03-21', atendente: 'Kaleb',   exame: 'PSA Total e Livre',          convenio: 'Bradesco',   valor_total: 55.00, valor_pago: 55.00, desconto: 0, acrescimo: 0, devedor: 0,     forma_pagamento: 'Cartão',   parcelas: 1, situacao: 'pago',     data_entrega: '2026-03-28', observacoes: '',                       login_paciente: '', senha_paciente: '', qr_code_url: '', created_at: '2026-03-21T09:00:00' },
    { id: 'AT231460', patient_id: 'P33210', nome_paciente: 'Luciana Ferreira Borges',        data: '2026-03-19', atendente: 'Cida',    exame: 'Ferritina',                  convenio: 'Particular', valor_total: 38.00, valor_pago: 0,     desconto: 0, acrescimo: 0, devedor: 38.00, forma_pagamento: 'Pendente', parcelas: 1, situacao: 'pendente', data_entrega: '2026-03-26', observacoes: 'Aguardando pagamento',  login_paciente: '', senha_paciente: '', qr_code_url: '', created_at: '2026-03-19T14:00:00' },
    { id: 'AT231440', patient_id: 'P33240', nome_paciente: 'Marcos Vinícius Cardoso',        data: '2026-03-15', atendente: 'Adriana', exame: 'Hemograma Completo',         convenio: 'SUS',        valor_total: 25.00, valor_pago: 25.00, desconto: 0, acrescimo: 0, devedor: 0,     forma_pagamento: 'Dinheiro', parcelas: 1, situacao: 'pago',     data_entrega: '2026-03-16', observacoes: '',                       login_paciente: '', senha_paciente: '', qr_code_url: '', created_at: '2026-03-15T10:20:00' },
    { id: 'AT231420', patient_id: 'P33260', nome_paciente: 'Rosangela Batista Pinto',        data: '2026-03-12', atendente: 'Kaleb',   exame: 'TGO / AST',                  convenio: 'Unimed',     valor_total: 20.00, valor_pago: 20.00, desconto: 0, acrescimo: 0, devedor: 0,     forma_pagamento: 'Pix',      parcelas: 1, situacao: 'pago',     data_entrega: '2026-03-13', observacoes: '',                       login_paciente: '', senha_paciente: '', qr_code_url: '', created_at: '2026-03-12T13:30:00' }
  ];

  const SEED_CAIXA = [
    { id: 'CX001', data: '2026-03-24', tipo: 'entrada', patient_id: 'P32912', paciente: 'Paulo Ricardo Nascimento Marti', servico: 'Hemograma Completo',        valor: 25.00,  forma: 'Pix',      parcelas: 1, atendente: 'Adriana',  obs: '',                       created_at: '2026-03-24T09:15:00' },
    { id: 'CX002', data: '2026-03-24', tipo: 'entrada', patient_id: 'P33001', paciente: 'Maria Aparecida dos Santos',     servico: 'TSH (Tireotropina)',         valor: 45.00,  forma: 'Cartão',   parcelas: 1, atendente: 'Cida',     obs: '',                       created_at: '2026-03-24T09:40:00' },
    { id: 'CX003', data: '2026-03-24', tipo: 'entrada', patient_id: 'P33145', paciente: 'Fernanda Beatriz Costa',         servico: 'Colesterol Total + Frações', valor: 20.00,  forma: 'Parcelado', parcelas: 2, atendente: 'Adriana', obs: 'Parcela 1/2',           created_at: '2026-03-24T10:05:00' },
    { id: 'CX004', data: '2026-03-24', tipo: 'entrada', patient_id: 'P33042', paciente: 'João Carlos Pereira Lima',       servico: 'Vitamina D (25-OH)',         valor: 68.00,  forma: 'Dinheiro', parcelas: 1, atendente: 'Kaleb',    obs: 'Desconto R$5 aplicado', created_at: '2026-03-24T10:30:00' },
    { id: 'CX005', data: '2026-03-24', tipo: 'entrada', patient_id: 'P33090', paciente: 'Ana Cláudia Menezes Silva',      servico: 'Urina Tipo I (EAS)',         valor: 22.00,  forma: 'Dinheiro', parcelas: 1, atendente: 'Cida',     obs: '',                       created_at: '2026-03-24T11:00:00' },
    { id: 'CX006', data: '2026-03-24', tipo: 'saida',   patient_id: '',       paciente: '',                               servico: 'Material de laboratório',    valor: 85.00,  forma: 'Dinheiro', parcelas: 1, atendente: 'Dr. Omar', obs: 'Reposição de reagentes', created_at: '2026-03-24T08:00:00' },
    { id: 'CX007', data: '2026-03-23', tipo: 'entrada', patient_id: 'P33110', paciente: 'Carlos Eduardo Rocha',           servico: 'Glicemia em Jejum',          valor: 18.00,  forma: 'Pix',      parcelas: 1, atendente: 'Adriana',  obs: '',                       created_at: '2026-03-23T09:00:00' },
    { id: 'CX008', data: '2026-03-23', tipo: 'entrada', patient_id: 'P33198', paciente: 'Roberto Alves Nascimento',       servico: 'PSA Total e Livre',          valor: 55.00,  forma: 'Cartão',   parcelas: 1, atendente: 'Kaleb',    obs: '',                       created_at: '2026-03-23T10:30:00' },
    { id: 'CX009', data: '2026-03-22', tipo: 'entrada', patient_id: 'P33001', paciente: 'Maria Aparecida dos Santos',     servico: 'Hemograma Completo',         valor: 25.00,  forma: 'Dinheiro', parcelas: 1, atendente: 'Cida',     obs: '',                       created_at: '2026-03-22T08:30:00' },
    { id: 'CX010', data: '2026-03-22', tipo: 'saida',   patient_id: '',       paciente: '',                               servico: 'Energia elétrica',           valor: 320.00, forma: 'Dinheiro', parcelas: 1, atendente: 'Dr. Omar', obs: 'Conta de luz',          created_at: '2026-03-22T17:00:00' },
    { id: 'CX011', data: '2026-03-21', tipo: 'entrada', patient_id: 'P33210', paciente: 'Luciana Ferreira Borges',        servico: 'Ferritina',                  valor: 38.00,  forma: 'Pix',      parcelas: 1, atendente: 'Cida',     obs: '',                       created_at: '2026-03-21T14:20:00' },
    { id: 'CX012', data: '2026-03-20', tipo: 'entrada', patient_id: 'P33042', paciente: 'João Carlos Pereira Lima',       servico: 'TGP / ALT',                  valor: 20.00,  forma: 'Dinheiro', parcelas: 1, atendente: 'Adriana',  obs: '',                       created_at: '2026-03-20T11:00:00' },
    { id: 'CX013', data: '2026-03-19', tipo: 'entrada', patient_id: 'P33145', paciente: 'Fernanda Beatriz Costa',         servico: 'Coagulograma (TP/TTPA)',     valor: 35.00,  forma: 'Dinheiro', parcelas: 1, atendente: 'Kaleb',    obs: '',                       created_at: '2026-03-19T09:30:00' },
    { id: 'CX014', data: '2026-03-18', tipo: 'entrada', patient_id: 'P33110', paciente: 'Carlos Eduardo Rocha',           servico: 'Creatinina',                 valor: 18.00,  forma: 'Pix',      parcelas: 1, atendente: 'Adriana',  obs: '',                       created_at: '2026-03-18T10:00:00' },
    { id: 'CX015', data: '2026-03-18', tipo: 'saida',   patient_id: '',       paciente: '',                               servico: 'Material de escritório',     valor: 45.00,  forma: 'Dinheiro', parcelas: 1, atendente: 'Cida',     obs: '',                       created_at: '2026-03-18T16:00:00' }
  ];

  /* ============================================================
     MODO localStorage (fallback)
  ============================================================ */
  function lsGet(key) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }
  function lsSave(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }

  function lsSeed() {
    if (localStorage.getItem(KEYS.seeded)) return;
    lsSave(KEYS.pacientes,    SEED_PACIENTES);
    lsSave(KEYS.exames,       SEED_EXAMES);
    lsSave(KEYS.funcionarios, SEED_FUNCIONARIOS);
    lsSave(KEYS.atendimentos, SEED_ATENDIMENTOS);
    lsSave(KEYS.caixa,        SEED_CAIXA);
    localStorage.setItem(KEYS.config, JSON.stringify(DEFAULT_CONFIG));
    localStorage.setItem(KEYS.seeded, '1');
  }

  /* ============================================================
     INIT — carrega dados para o cache
  ============================================================ */
  async function init() {
    if (_initialized) return;

    if (USE_SUPABASE) {
      try {
        const [pac, at, cx, ex, fn, cfg] = await Promise.all([
          SUPA.from('pacientes').select('*').order('nome'),
          SUPA.from('atendimentos').select('*').order('created_at', { ascending: false }),
          SUPA.from('caixa').select('*').order('created_at', { ascending: false }),
          SUPA.from('exames').select('*').order('nome'),
          SUPA.from('funcionarios').select('*').order('nome'),
          SUPA.from('config').select('*').eq('id', 1).maybeSingle()
        ]);
        if (pac.error) throw pac.error;
        cache.pacientes    = pac.data    || [];
        cache.atendimentos = at.data     || [];
        cache.caixa        = cx.data     || [];
        cache.exames       = ex.data     || [];
        cache.funcionarios = fn.data     || [];
        cache.config       = cfg.data?.dados || DEFAULT_CONFIG;
        if (cache.pacientes.length === 0) await _supabaseSeed();
      } catch (err) {
        console.error('Supabase init error:', err);
        // Fallback to localStorage
        lsSeed();
        cache.pacientes    = lsGet(KEYS.pacientes);
        cache.atendimentos = lsGet(KEYS.atendimentos);
        cache.caixa        = lsGet(KEYS.caixa);
        cache.exames       = lsGet(KEYS.exames);
        cache.funcionarios = lsGet(KEYS.funcionarios);
        const rawCfg = localStorage.getItem(KEYS.config);
        cache.config = rawCfg ? JSON.parse(rawCfg) : DEFAULT_CONFIG;
        setTimeout(() => {
          if (typeof UTILS !== 'undefined') UTILS.toast('⚠️ Supabase indisponível — usando dados locais.', 'warning', 6000);
        }, 500);
      }
    } else {
      lsSeed();
      cache.pacientes    = lsGet(KEYS.pacientes);
      cache.atendimentos = lsGet(KEYS.atendimentos);
      cache.caixa        = lsGet(KEYS.caixa);
      cache.exames       = lsGet(KEYS.exames);
      cache.funcionarios = lsGet(KEYS.funcionarios);
      const rawCfg = localStorage.getItem(KEYS.config);
      cache.config = rawCfg ? JSON.parse(rawCfg) : DEFAULT_CONFIG;
    }
    _initialized = true;
  }

  async function _supabaseSeed() {
    await Promise.all([
      SUPA.from('pacientes').insert(SEED_PACIENTES),
      SUPA.from('exames').insert(SEED_EXAMES),
      SUPA.from('funcionarios').insert(SEED_FUNCIONARIOS),
      SUPA.from('atendimentos').insert(SEED_ATENDIMENTOS),
      SUPA.from('caixa').insert(SEED_CAIXA),
      SUPA.from('config').upsert({ id: 1, dados: DEFAULT_CONFIG })
    ]);
    // Recarrega o cache após seed
    cache.pacientes    = SEED_PACIENTES;
    cache.atendimentos = SEED_ATENDIMENTOS;
    cache.caixa        = SEED_CAIXA;
    cache.exames       = SEED_EXAMES;
    cache.funcionarios = SEED_FUNCIONARIOS;
    cache.config       = DEFAULT_CONFIG;
  }

  /* ============================================================
     HELPERS internos
  ============================================================ */
  function _lsSync(key, arr) {
    if (!USE_SUPABASE) lsSave(key, arr);
  }

  /* ============================================================
     ENTIDADES — API pública
     Reads: síncronos (do cache)
     Writes: async (Supabase ou localStorage)
  ============================================================ */

  const Pacientes = {
    getAll:  ()   => [...cache.pacientes],
    getById: (id) => cache.pacientes.find(p => p.id === id) || null,
    search:  (q)  => {
      const t = q.toLowerCase();
      return cache.pacientes.filter(p =>
        p.id.toLowerCase().includes(t) ||
        p.nome.toLowerCase().includes(t) ||
        (p.telefone||'').toLowerCase().includes(t)
      );
    },
    add: async (data) => {
      const item = { ...data, id: 'P' + Date.now().toString().slice(-5), created_at: new Date().toISOString() };
      if (USE_SUPABASE) {
        const { data: d, error } = await SUPA.from('pacientes').insert(item).select().single();
        if (error) {
          console.error('Pacientes.add error:', error);
          if (typeof UTILS !== 'undefined') UTILS.toast('Erro ao salvar paciente: ' + error.message, 'error');
          return null;
        }
        cache.pacientes.unshift(d || item);
        return d || item;
      }
      cache.pacientes.unshift(item);
      _lsSync(KEYS.pacientes, cache.pacientes);
      return item;
    },
    update: async (id, changes) => {
      if (USE_SUPABASE) {
        const { error } = await SUPA.from('pacientes').update(changes).eq('id', id);
        if (error) {
          console.error('Pacientes.update error:', error);
          if (typeof UTILS !== 'undefined') UTILS.toast('Erro ao atualizar paciente: ' + error.message, 'error');
          return;
        }
      }
      const idx = cache.pacientes.findIndex(p => p.id === id);
      if (idx !== -1) { cache.pacientes[idx] = { ...cache.pacientes[idx], ...changes }; }
      _lsSync(KEYS.pacientes, cache.pacientes);
    },
    remove: async (id) => {
      if (USE_SUPABASE) {
        const { error } = await SUPA.from('pacientes').delete().eq('id', id);
        if (error) {
          console.error('Pacientes.remove error:', error);
          if (typeof UTILS !== 'undefined') UTILS.toast('Erro ao excluir paciente: ' + error.message, 'error');
          return;
        }
      }
      cache.pacientes = cache.pacientes.filter(p => p.id !== id);
      _lsSync(KEYS.pacientes, cache.pacientes);
    }
  };

  const Atendimentos = {
    getAll:       ()    => [...cache.atendimentos],
    getById:      (id)  => cache.atendimentos.find(a => a.id === id) || null,
    getByPatient: (pid) => cache.atendimentos.filter(a => a.patient_id === pid),
    add: async (data) => {
      const item = { ...data, id: 'AT' + Date.now(), created_at: new Date().toISOString() };
      if (USE_SUPABASE) {
        const { data: d } = await SUPA.from('atendimentos').insert(item).select().single();
        cache.atendimentos.unshift(d || item);
        return d || item;
      }
      cache.atendimentos.unshift(item);
      _lsSync(KEYS.atendimentos, cache.atendimentos);
      return item;
    },
    update: async (id, changes) => {
      if (USE_SUPABASE) await SUPA.from('atendimentos').update(changes).eq('id', id);
      const idx = cache.atendimentos.findIndex(a => a.id === id);
      if (idx !== -1) { cache.atendimentos[idx] = { ...cache.atendimentos[idx], ...changes }; }
      _lsSync(KEYS.atendimentos, cache.atendimentos);
    },
    remove: async (id) => {
      if (USE_SUPABASE) await SUPA.from('atendimentos').delete().eq('id', id);
      cache.atendimentos = cache.atendimentos.filter(a => a.id !== id);
      _lsSync(KEYS.atendimentos, cache.atendimentos);
    }
  };

  const Caixa = {
    getAll:     ()           => [...cache.caixa],
    getByDate:  (date)       => cache.caixa.filter(c => c.data === date),
    getByRange: (ini, fim)   => cache.caixa.filter(c => c.data >= ini && c.data <= fim),
    add: async (data) => {
      const item = { ...data, id: 'CX' + Date.now(), created_at: new Date().toISOString() };
      if (USE_SUPABASE) {
        const { data: d } = await SUPA.from('caixa').insert(item).select().single();
        cache.caixa.unshift(d || item);
        return d || item;
      }
      cache.caixa.unshift(item);
      _lsSync(KEYS.caixa, cache.caixa);
      return item;
    },
    update: async (id, changes) => {
      if (USE_SUPABASE) await SUPA.from('caixa').update(changes).eq('id', id);
      const idx = cache.caixa.findIndex(c => c.id === id);
      if (idx !== -1) { cache.caixa[idx] = { ...cache.caixa[idx], ...changes }; }
      _lsSync(KEYS.caixa, cache.caixa);
    },
    remove: async (id) => {
      if (USE_SUPABASE) await SUPA.from('caixa').delete().eq('id', id);
      cache.caixa = cache.caixa.filter(c => c.id !== id);
      _lsSync(KEYS.caixa, cache.caixa);
    },
    totalsToday: () => {
      const today = new Date().toISOString().slice(0,10);
      const rows  = cache.caixa.filter(c => c.data === today);
      const entradas = rows.filter(c => c.tipo === 'entrada').reduce((s,c) => s + (c.valor||0), 0);
      const saidas   = rows.filter(c => c.tipo === 'saida').reduce((s,c) => s + (c.valor||0), 0);
      return { entradas, saidas, saldo: entradas - saidas };
    },
    totalsMonth: () => {
      const now = new Date();
      const ym  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const rows = cache.caixa.filter(c => c.data && c.data.startsWith(ym));
      const entradas = rows.filter(c => c.tipo === 'entrada').reduce((s,c) => s + (c.valor||0), 0);
      const saidas   = rows.filter(c => c.tipo === 'saida').reduce((s,c) => s + (c.valor||0), 0);
      return { entradas, saidas, saldo: entradas - saidas };
    }
  };

  const Exames = {
    getAll:  ()    => [...cache.exames],
    getById: (id)  => cache.exames.find(e => e.id === id) || null,
    add: async (data) => {
      const item = { ...data, id: 'EX' + Date.now(), created_at: new Date().toISOString() };
      if (USE_SUPABASE) {
        const { data: d } = await SUPA.from('exames').insert(item).select().single();
        cache.exames.unshift(d || item);
        return d || item;
      }
      cache.exames.unshift(item);
      _lsSync(KEYS.exames, cache.exames);
      return item;
    },
    update: async (id, changes) => {
      if (USE_SUPABASE) await SUPA.from('exames').update(changes).eq('id', id);
      const idx = cache.exames.findIndex(e => e.id === id);
      if (idx !== -1) { cache.exames[idx] = { ...cache.exames[idx], ...changes }; }
      _lsSync(KEYS.exames, cache.exames);
    },
    remove: async (id) => {
      if (USE_SUPABASE) await SUPA.from('exames').delete().eq('id', id);
      cache.exames = cache.exames.filter(e => e.id !== id);
      _lsSync(KEYS.exames, cache.exames);
    }
  };

  const Funcionarios = {
    getAll:  ()   => [...cache.funcionarios],
    getById: (id) => cache.funcionarios.find(f => f.id === id) || null,
    add: async (data) => {
      const item = { ...data, id: 'F' + Date.now(), created_at: new Date().toISOString() };
      if (USE_SUPABASE) {
        const { data: d } = await SUPA.from('funcionarios').insert(item).select().single();
        cache.funcionarios.unshift(d || item);
        return d || item;
      }
      cache.funcionarios.unshift(item);
      _lsSync(KEYS.funcionarios, cache.funcionarios);
      return item;
    },
    update: async (id, changes) => {
      if (USE_SUPABASE) await SUPA.from('funcionarios').update(changes).eq('id', id);
      const idx = cache.funcionarios.findIndex(f => f.id === id);
      if (idx !== -1) { cache.funcionarios[idx] = { ...cache.funcionarios[idx], ...changes }; }
      _lsSync(KEYS.funcionarios, cache.funcionarios);
    },
    remove: async (id) => {
      if (USE_SUPABASE) await SUPA.from('funcionarios').delete().eq('id', id);
      cache.funcionarios = cache.funcionarios.filter(f => f.id !== id);
      _lsSync(KEYS.funcionarios, cache.funcionarios);
    }
  };

  const Config = {
    get: () => cache.config || DEFAULT_CONFIG,
    save: async (data) => {
      const merged = { ...Config.get(), ...data };
      cache.config = merged;
      if (USE_SUPABASE) {
        await SUPA.from('config').upsert({ id: 1, dados: merged });
      } else {
        localStorage.setItem(KEYS.config, JSON.stringify(merged));
      }
    }
  };

  /* ============================================================
     ANALYTICS — leitura do cache (síncronos)
  ============================================================ */
  const Analytics = {
    atendimentosByAtendente: () => {
      const map = {};
      cache.atendimentos.forEach(a => { map[a.atendente] = (map[a.atendente]||0) + 1; });
      return Object.entries(map).sort((a,b) => b[1]-a[1]).map(([nome,count]) => ({ nome, count }));
    },
    revenueByDay: (days = 7) => {
      const result = [];
      for (let i = days-1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0,10);
        const rows = cache.caixa.filter(c => c.data === dateStr && c.tipo === 'entrada');
        result.push({ date: dateStr, label: d.toLocaleDateString('pt-BR',{weekday:'short',day:'numeric'}), value: rows.reduce((s,c)=>s+(c.valor||0),0) });
      }
      return result;
    },
    revenueByPayment: () => {
      const map = {};
      cache.caixa.filter(c => c.tipo === 'entrada').forEach(c => {
        map[c.forma] = (map[c.forma]||0) + (c.valor||0);
      });
      return Object.entries(map).map(([label,value]) => ({ label, value }));
    },
    openAmount: () => cache.atendimentos.reduce((s,a) => s + (a.devedor||0), 0)
  };

  return { init, Pacientes, Atendimentos, Caixa, Exames, Funcionarios, Config, Analytics, KEYS, USE_SUPABASE };
})();
