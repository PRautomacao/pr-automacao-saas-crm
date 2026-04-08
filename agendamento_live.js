const item = $input.item.json || {};
const t = item.triage || {};
const ctx = item.conversation_context || {};
const p = item.clinic_profile || {};
const examCatalog = Array.isArray(item.exam_catalog) ? item.exam_catalog : [];

const messageText = String(item.message_text || '').trim();

function norm(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s:/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeExamText(v) {
  let t = norm(v);
  const map = [
    [/\bcreatina\b/g, 'creatinina'],
    [/\bhemograma\b/g, 'hemograma completo'],
    [/\burina simples\b/g, 'eas'],
    [/\burina tipo 1\b/g, 'eas'],
    [/\burina tipo i\b/g, 'eas'],
    [/\beas\b/g, 'eas'],
    [/\brubela\b/g, 'rubeola'],
    [/\bt4l\b/g, 't4 livre'],
  ];
  for (const [rgx, rep] of map) t = t.replace(rgx, rep);
  return t.replace(/\s+/g, ' ').trim();
}

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function safeParseAliases(aliases) {
  if (Array.isArray(aliases)) return aliases;
  if (typeof aliases === 'string') {
    try {
      const parsed = JSON.parse(aliases);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getAliases(exam) {
  return uniq([exam.nome, exam.codigo, ...safeParseAliases(exam.aliases)])
    .map(normalizeExamText)
    .filter(Boolean);
}

function examToSafe(exam) {
  return {
    id: exam.id || null,
    codigo: exam.codigo || null,
    nome: exam.nome || null,
    tipo: exam.tipo || null,
    valor: exam.valor ?? null,
    convenio: exam.convenio ?? null,
    preparo: exam.preparo || null,
    prazo_entrega: exam.prazo_entrega || null,
    precisa_agendamento: exam.precisa_agendamento ?? null,
    restrito: exam.restrito ?? false,
    pode_cotar_whatsapp: exam.pode_cotar_whatsapp ?? null,
    precisa_jejum: exam.precisa_jejum ?? null,
    horas_jejum: exam.horas_jejum ?? null
  };
}

function findExam(term) {
  const txt = normalizeExamText(term);
  if (!txt) return null;

  for (const exam of examCatalog) {
    const aliases = getAliases(exam);
    if (aliases.some(a => a === txt || txt.includes(a) || a.includes(txt))) {
      return exam;
    }
  }
  return null;
}

function splitExamTerms(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  return uniq(
    raw
      .replace(/\n/g, ',')
      .replace(/\s+e\s+/gi, ',')
      .replace(/\s+mais\s+/gi, ',')
      .replace(/\//g, ',')
      .replace(/;/g, ',')
      .split(',')
      .map(s => normalizeExamText(s))
      .filter(Boolean)
  );
}

function detectTipoColeta(text) {
  const n = norm(text);
  if (
    n.includes('coleta em casa') ||
    n.includes('coleta domiciliar') ||
    n.includes('em domicilio') ||
    n.includes('em domic├¡lio') ||
    n === 'domiciliar' ||
    n === 'em casa'
  ) return 'domiciliar';

  if (
    n.includes('na clinica') ||
    n.includes('na cl├¡nica') ||
    n.includes('na unidade') ||
    n === 'clinica' ||
    n === 'cl├¡nica'
  ) return 'clinica';

  return null;
}

function detectDate(text) {
  const raw = String(text || '');
  const m = raw.match(/\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/);
  if (m) return m[1];

  if (/\b(amanha|amanh├ú|hoje|segunda|terca|ter├ºa|quarta|quinta|sexta|sabado|s├íbado|domingo)\b/i.test(raw)) {
    return raw.trim();
  }

  return null;
}

function detectTime(text) {
  const raw = String(text || '');
  const m = raw.match(/\b(\d{1,2}:\d{2}|\d{1,2}h)\b/);
  if (m) return m[1];

  if (/\b(primeiro horario|primeiro hor├írio|de manha|de manh├ú|a tarde|├á tarde)\b/i.test(raw)) {
    return raw.trim();
  }

  return null;
}

function extractPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

function formatPhone(value) {
  const digits = extractPhone(value);
  return digits ? `+${digits}` : null;
}

function looksLikeFullName(name) {
  const n = String(name || '').trim();
  if (!n) return false;
  if (n === 'Cliente WhatsApp') return false;
  if (/\d/.test(n)) return false;
  return n.split(' ').filter(Boolean).length >= 2;
}

function isAffirmative(text) {
  return ['sim', 'isso', 'correto', 'confirmo', 'ok', 'certo', 'pode', 'pode seguir', 'pode confirmar'].includes(norm(text));
}

function isNegative(text) {
  return ['nao', 'n├úo', 'corrigir', 'ajustar', 'errado', 'incorreto'].includes(norm(text));
}

function formatMoney(v) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

let customer_name =
  ctx.paciente_nome ||
  item.paciente_nome ||
  item.customer_name ||
  'Cliente WhatsApp';

let customer_phone =
  ctx.customer_phone ||
  item.customer_phone ||
  (item.phone_normalized ? `+${item.phone_normalized}` : null) ||
  null;

let tipo_coleta = ctx.tipo_coleta || detectTipoColeta(messageText) || null;
let endereco_coleta = ctx.endereco_coleta || null;
let data_preferida = ctx.data_preferida || null;
let horario_preferido = ctx.horario_preferido || null;
let collect_field = ctx.collect_field || null;

let budgetResolved = Array.isArray(ctx.budget_resolved_exams) ? ctx.budget_resolved_exams : [];
let budgetExamNames = Array.isArray(ctx.budget_exam_names_list) ? ctx.budget_exam_names_list : [];
let budgetTotal = ctx.budget_total_snapshot || null;

// bootstrap s├│ se n├úo houver snapshot oficial
if (!budgetExamNames.length) {
  const fromTriage = Array.isArray(t.exam_names_list) ? t.exam_names_list : [];
  const names = fromTriage.length ? fromTriage : splitExamTerms(messageText);
  const resolved = [];

  for (const name of names) {
    const exam = findExam(name);
    if (exam) resolved.push(examToSafe(exam));
  }

  if (resolved.length) {
    budgetResolved = resolved;
    budgetExamNames = resolved.map(e => e.nome).filter(Boolean);

    let totalKnown = 0;
    let totalFullyKnown = true;
    for (const exam of resolved) {
      if (exam.valor !== null && exam.valor !== undefined && exam.pode_cotar_whatsapp !== false) {
        totalKnown += Number(exam.valor || 0);
      } else {
        totalFullyKnown = false;
      }
    }
    budgetTotal = totalFullyKnown ? formatMoney(totalKnown) : null;
  }
}

if (collect_field === 'nome_completo') {
  if (looksLikeFullName(messageText)) {
    customer_name = messageText.trim();
    collect_field = null;
  } else {
    return [{
      json: {
        ...item,
        active_subagent: 'scheduling_agent',
        ai_reply_override: 'Para seguir com o agendamento, preciso do seu *nome completo*. Pode me informar, por favor?',
        force_response_status: 'need_clarification',
        safe_data: {
          ...(item.safe_data || {}),
          customer_name,
          customer_phone,
          budget_exam_names_list: budgetExamNames,
          budget_resolved_exams: budgetResolved,
          budget_total_snapshot: budgetTotal
        },
        conversation_context: {
          ...ctx,
          collect_field: 'nome_completo',
          agendamento_etapa: 'coletando_nome'
        }
      }
    }];
  }
}

if (collect_field === 'tipo_coleta') {
  const tipo = detectTipoColeta(messageText);
  if (tipo) {
    tipo_coleta = tipo;
    collect_field = null;
  } else {
    return [{
      json: {
        ...item,
        active_subagent: 'scheduling_agent',
        ai_reply_override: 'Voc├¬ prefere realizar a coleta na *cl├¡nica* ou por *coleta domiciliar*?',
        force_response_status: 'need_clarification',
        safe_data: {
          ...(item.safe_data || {}),
          customer_name,
          customer_phone,
          budget_exam_names_list: budgetExamNames,
          budget_resolved_exams: budgetResolved,
          budget_total_snapshot: budgetTotal
        },
        conversation_context: {
          ...ctx,
          collect_field: 'tipo_coleta',
          agendamento_etapa: 'coletando_tipo_coleta'
        }
      }
    }];
  }
}

if (collect_field === 'endereco_coleta') {
  if (messageText.trim().length >= 8) {
    endereco_coleta = messageText.trim();
    collect_field = null;
  } else {
    return [{
      json: {
        ...item,
        active_subagent: 'scheduling_agent',
        ai_reply_override: 'Pode me informar o *endere├ºo completo* da coleta domiciliar, por favor?',
        force_response_status: 'need_clarification',
        safe_data: {
          ...(item.safe_data || {}),
          customer_name,
          customer_phone,
          budget_exam_names_list: budgetExamNames,
          budget_resolved_exams: budgetResolved,
          budget_total_snapshot: budgetTotal,
          tipo_coleta
        },
        conversation_context: {
          ...ctx,
          collect_field: 'endereco_coleta',
          agendamento_etapa: 'coletando_endereco',
          tipo_coleta
        }
      }
    }];
  }
}

if (collect_field === 'data_preferida') {
  const data = detectDate(messageText);
  if (data) {
    data_preferida = data;
    collect_field = null;
  } else {
    return [{
      json: {
        ...item,
        active_subagent: 'scheduling_agent',
        ai_reply_override: 'Pode me informar a *data preferida* para a coleta?',
        force_response_status: 'need_clarification',
        safe_data: {
          ...(item.safe_data || {}),
          customer_name,
          customer_phone,
          budget_exam_names_list: budgetExamNames,
          budget_resolved_exams: budgetResolved,
          budget_total_snapshot: budgetTotal,
          tipo_coleta,
          endereco_coleta
        },
        conversation_context: {
          ...ctx,
          collect_field: 'data_preferida',
          agendamento_etapa: 'coletando_data',
          tipo_coleta,
          endereco_coleta
        }
      }
    }];
  }
}

if (collect_field === 'horario_preferido') {
  const horario = detectTime(messageText);
  if (horario) {
    horario_preferido = horario;
    collect_field = null;
  } else {
    return [{
      json: {
        ...item,
        active_subagent: 'scheduling_agent',
        ai_reply_override: 'Pode me informar o *hor├írio preferido* para a coleta?',
        force_response_status: 'need_clarification',
        safe_data: {
          ...(item.safe_data || {}),
          customer_name,
          customer_phone,
          budget_exam_names_list: budgetExamNames,
          budget_resolved_exams: budgetResolved,
          budget_total_snapshot: budgetTotal,
          tipo_coleta,
          endereco_coleta,
          data_preferida
        },
        conversation_context: {
          ...ctx,
          collect_field: 'horario_preferido',
          agendamento_etapa: 'coletando_horario',
          tipo_coleta,
          endereco_coleta,
          data_preferida
        }
      }
    }];
  }
}

if (collect_field === 'telefone_contato') {
  const phone = formatPhone(messageText);
  if (phone) {
    customer_phone = phone;
    collect_field = null;
  } else {
    return [{
      json: {
        ...item,
        active_subagent: 'scheduling_agent',
        ai_reply_override: 'N├úo consegui identificar o telefone. Pode me enviar apenas o *n├║mero com DDD*, por favor?',
        force_response_status: 'need_clarification',
        safe_data: {
          ...(item.safe_data || {}),
          customer_name,
          customer_phone,
          budget_exam_names_list: budgetExamNames,
          budget_resolved_exams: budgetResolved,
          budget_total_snapshot: budgetTotal,
          tipo_coleta,
          endereco_coleta,
          data_preferida,
          horario_preferido
        },
        conversation_context: {
          ...ctx,
          collect_field: 'telefone_contato',
          agendamento_etapa: 'coletando_telefone',
          tipo_coleta,
          endereco_coleta,
          data_preferida,
          horario_preferido
        }
      }
    }];
  }
}

if (collect_field === 'confirmar_pedido_agendamento') {
  if (isAffirmative(messageText)) {
    const resumoFinal = [
      'Perfeito. Seu *pedido foi registrado* com os seguintes dados:',
      `ÔÇó Nome: *${customer_name}*`,
      customer_phone ? `ÔÇó Contato: *${customer_phone}*` : null,
      budgetExamNames.length ? `ÔÇó Exames: *${budgetExamNames.join(', ')}*` : null,
      `ÔÇó Tipo de coleta: *${tipo_coleta === 'domiciliar' ? 'Domiciliar' : 'Na cl├¡nica'}*`,
      tipo_coleta === 'domiciliar' && endereco_coleta ? `ÔÇó Endere├ºo: *${endereco_coleta}*` : null,
      data_preferida ? `ÔÇó Data preferida: *${data_preferida}*` : null,
      horario_preferido ? `ÔÇó Hor├írio preferido: *${horario_preferido}*` : null,
      budgetTotal ? `ÔÇó Valor total informado: *${budgetTotal}*` : null,
      '',
      'A equipe da Bio An├ílise far├í a *confirma├º├úo final da disponibilidade*.'
    ].filter(Boolean).join('\n');

    return [{
      json: {
        ...item,
        active_subagent: 'scheduling_agent',
        ai_reply_override: resumoFinal,
        force_response_status: 'answered',
        safe_data: {
          ...(item.safe_data || {}),
          customer_name,
          customer_phone,
          exam_names_list: budgetExamNames,
          budget_exam_names_list: budgetExamNames,
          budget_resolved_exams: budgetResolved,
          budget_total_snapshot: budgetTotal,
          tipo_coleta,
          endereco_coleta,
          data_preferida,
          horario_preferido,
          disponibilidade_status: 'pendente_validacao'
        },
        conversation_context: {
          ...ctx,
          paciente_nome: customer_name,
          customer_phone,
          collect_field: null,
          agendamento_etapa: 'finalizado',
          last_exam_names_list: budgetExamNames,
          last_exam_name_raw: budgetExamNames[0] || ctx.last_exam_name_raw || null,
          budget_exam_names_list: budgetExamNames,
          budget_resolved_exams: budgetResolved,
          budget_total_snapshot: budgetTotal,
          tipo_coleta,
          endereco_coleta,
          data_preferida,
          horario_preferido
        }
      }
    }];
  }

  if (isNegative(messageText)) {
    return [{
      json: {
        ...item,
        active_subagent: 'scheduling_agent',
        ai_reply_override: 'Tudo bem. Me informe o que deseja ajustar no pedido: *exames*, *data*, *hor├írio*, *tipo de coleta* ou *contato*.',
        force_response_status: 'need_clarification',
        conversation_context: {
          ...ctx,
          collect_field: 'ajuste_pedido',
          agendamento_etapa: 'ajustando_pedido',
          tipo_coleta,
          endereco_coleta,
          data_preferida,
          horario_preferido
        },
        safe_data: {
          ...(item.safe_data || {}),
          customer_name,
          customer_phone,
          budget_exam_names_list: budgetExamNames,
          budget_resolved_exams: budgetResolved,
          budget_total_snapshot: budgetTotal
        }
      }
    }];
  }
}

if (collect_field === 'ajuste_pedido') {
  return [{
    json: {
      ...item,
      active_subagent: 'scheduling_agent',
      ai_reply_override: 'Perfeito. Pode me enviar novamente os dados corrigidos, e eu monto um novo resumo para confirma├º├úo.',
      force_response_status: 'need_clarification',
      conversation_context: {
        ...ctx,
        collect_field: null,
        agendamento_etapa: 'coletando_dados',
        tipo_coleta,
        endereco_coleta,
        data_preferida,
        horario_preferido
      },
      safe_data: {
        ...(item.safe_data || {}),
        customer_name,
        customer_phone,
        budget_exam_names_list: budgetExamNames,
        budget_resolved_exams: budgetResolved,
        budget_total_snapshot: budgetTotal
      }
    }
  }];
}

if (!budgetExamNames.length) {
  return [{
    json: {
      ...item,
      active_subagent: 'scheduling_agent',
      ai_reply_override: 'Para seguir com o agendamento, preciso confirmar *quais exames* voc├¬ deseja realizar.',
      force_response_status: 'need_clarification',
      conversation_context: {
        ...ctx,
        collect_field: 'nome_exame',
        agendamento_etapa: 'coletando_exames'
      },
      safe_data: {
        ...(item.safe_data || {}),
        customer_name,
        customer_phone
      }
    }
  }];
}

if (!looksLikeFullName(customer_name)) {
  return [{
    json: {
      ...item,
      active_subagent: 'scheduling_agent',
      ai_reply_override: 'Para seguir com o agendamento, preciso do seu *nome completo*. Como devo registrar?',
      force_response_status: 'need_clarification',
      conversation_context: {
        ...ctx,
        collect_field: 'nome_completo',
        agendamento_etapa: 'coletando_nome'
      },
      safe_data: {
        ...(item.safe_data || {}),
        customer_name,
        customer_phone,
        budget_exam_names_list: budgetExamNames,
        budget_resolved_exams: budgetResolved,
        budget_total_snapshot: budgetTotal
      }
    }
  }];
}

if (!tipo_coleta) {
  return [{
    json: {
      ...item,
      active_subagent: 'scheduling_agent',
      ai_reply_override: 'Voc├¬ deseja realizar a coleta na *cl├¡nica* ou por *coleta domiciliar*?',
      force_response_status: 'need_clarification',
      conversation_context: {
        ...ctx,
        collect_field: 'tipo_coleta',
        agendamento_etapa: 'coletando_tipo_coleta'
      },
      safe_data: {
        ...(item.safe_data || {}),
        customer_name,
        customer_phone,
        budget_exam_names_list: budgetExamNames,
        budget_resolved_exams: budgetResolved,
        budget_total_snapshot: budgetTotal
      }
    }
  }];
}

if (tipo_coleta === 'domiciliar' && !endereco_coleta) {
  return [{
    json: {
      ...item,
      active_subagent: 'scheduling_agent',
      ai_reply_override: 'Para a *coleta domiciliar*, preciso do *endere├ºo completo* onde a equipe dever├í realizar a coleta.',
      force_response_status: 'need_clarification',
      conversation_context: {
        ...ctx,
        collect_field: 'endereco_coleta',
        agendamento_etapa: 'coletando_endereco',
        tipo_coleta
      },
      safe_data: {
        ...(item.safe_data || {}),
        customer_name,
        customer_phone,
        budget_exam_names_list: budgetExamNames,
        budget_resolved_exams: budgetResolved,
        budget_total_snapshot: budgetTotal,
        tipo_coleta
      }
    }
  }];
}

if (!data_preferida) {
  return [{
    json: {
      ...item,
      active_subagent: 'scheduling_agent',
      ai_reply_override: 'Qual a *data preferida* para a coleta?',
      force_response_status: 'need_clarification',
      conversation_context: {
        ...ctx,
        collect_field: 'data_preferida',
        agendamento_etapa: 'coletando_data',
        tipo_coleta,
        endereco_coleta
      },
      safe_data: {
        ...(item.safe_data || {}),
        customer_name,
        customer_phone,
        budget_exam_names_list: budgetExamNames,
        budget_resolved_exams: budgetResolved,
        budget_total_snapshot: budgetTotal,
        tipo_coleta,
        endereco_coleta
      }
    }
  }];
}

if (!horario_preferido) {
  return [{
    json: {
      ...item,
      active_subagent: 'scheduling_agent',
      ai_reply_override: 'Qual o *hor├írio preferido* para a coleta?',
      force_response_status: 'need_clarification',
      conversation_context: {
        ...ctx,
        collect_field: 'horario_preferido',
        agendamento_etapa: 'coletando_horario',
        tipo_coleta,
        endereco_coleta,
        data_preferida
      },
      safe_data: {
        ...(item.safe_data || {}),
        customer_name,
        customer_phone,
        budget_exam_names_list: budgetExamNames,
        budget_resolved_exams: budgetResolved,
        budget_total_snapshot: budgetTotal,
        tipo_coleta,
        endereco_coleta,
        data_preferida
      }
    }
  }];
}

if (!customer_phone) {
  return [{
    json: {
      ...item,
      active_subagent: 'scheduling_agent',
      ai_reply_override: 'Para finalizar o pedido, poderia me confirmar um *telefone para contato*, por favor?',
      force_response_status: 'need_clarification',
      conversation_context: {
        ...ctx,
        collect_field: 'telefone_contato',
        agendamento_etapa: 'coletando_telefone',
        tipo_coleta,
        endereco_coleta,
        data_preferida,
        horario_preferido
      },
      safe_data: {
        ...(item.safe_data || {}),
        customer_name,
        customer_phone,
        budget_exam_names_list: budgetExamNames,
        budget_resolved_exams: budgetResolved,
        budget_total_snapshot: budgetTotal,
        tipo_coleta,
        endereco_coleta,
        data_preferida,
        horario_preferido
      }
    }
  }];
}

const resumo = [
  'Antes de finalizar, vou resumir o seu pedido para confirma├º├úo:',
  `ÔÇó Nome: *${customer_name}*`,
  customer_phone ? `ÔÇó Contato: *${customer_phone}*` : null,
  `ÔÇó Exames: *${budgetExamNames.join(', ')}*`,
  `ÔÇó Tipo de coleta: *${tipo_coleta === 'domiciliar' ? 'Domiciliar' : 'Na cl├¡nica'}*`,
  tipo_coleta === 'domiciliar' && endereco_coleta ? `ÔÇó Endere├ºo: *${endereco_coleta}*` : null,
  `ÔÇó Data preferida: *${data_preferida}*`,
  `ÔÇó Hor├írio preferido: *${horario_preferido}*`,
  budgetTotal ? `ÔÇó Valor total informado: *${budgetTotal}*` : null,
  '',
  'Se estiver tudo certo, responda apenas *sim* para eu concluir o pedido.'
].filter(Boolean).join('\n');

return [{
  json: {
    ...item,
    active_subagent: 'scheduling_agent',
    ai_reply_override: resumo,
    force_response_status: 'need_clarification',
    conversation_context: {
      ...ctx,
      paciente_nome: customer_name,
      customer_phone,
      collect_field: 'confirmar_pedido_agendamento',
      agendamento_etapa: 'aguardando_confirmacao_final',
      last_exam_names_list: budgetExamNames,
      last_exam_name_raw: budgetExamNames[0] || ctx.last_exam_name_raw || null,
      budget_exam_names_list: budgetExamNames,
      budget_resolved_exams: budgetResolved,
      budget_total_snapshot: budgetTotal,
      tipo_coleta,
      endereco_coleta,
      data_preferida,
      horario_preferido
    },
    safe_data: {
      ...(item.safe_data || {}),
      customer_name,
      customer_phone,
      exam_names_list: budgetExamNames,
      budget_exam_names_list: budgetExamNames,
      budget_resolved_exams: budgetResolved,
      budget_total_snapshot: budgetTotal,
      tipo_coleta,
      endereco_coleta,
      data_preferida,
      horario_preferido,
      disponibilidade_status: 'pendente_validacao',
      horario_coleta: p.horario_coleta || null,
      note: 'O agendamento ├® provis├│rio e ser├í confirmado pela equipe da Bio An├ílise.'
    }
  }
}];
