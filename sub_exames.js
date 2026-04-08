const input = items[0]?.json || {};
const triage = input.triage || {};
const ctx = input.conversation_context || {};
const examCatalog = Array.isArray(input.exam_catalog) ? input.exam_catalog : [];

const mensagemOriginal =
  input.message_text ||
  input.mensagem_original ||
  input.mensagem_usuario ||
  input.message ||
  input.text ||
  input.body ||
  input.content ||
  '';

function norm(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeExamText(v) {
  let t = norm(v);

  const replacements = [
    [/\bcreatina\b/g, 'creatinina'],
    [/\bcreatin\b/g, 'creatinina'],
    [/\bhemograma\b/g, 'hemograma completo'],
    [/\bcbc\b/g, 'hemograma completo'],
    [/\bfero\b/g, 'ferro'],
    [/\brubela\b/g, 'rubeola'],
    [/\burina simples\b/g, 'eas'],
    [/\bexame de urina simples\b/g, 'eas'],
    [/\bexame de urina\b/g, 'eas'],
    [/\burina tipo 1\b/g, 'eas'],
    [/\burina tipo i\b/g, 'eas'],
    [/\beas\b/g, 'eas'],
    [/\bbeta-hcg\b/g, 'beta hcg'],
    [/\bbetahcg\b/g, 'beta hcg'],
    [/\bt4l\b/g, 't4 livre'],
    [/\bt3l\b/g, 't3 livre'],
    [/\btriglicerides\b/g, 'triglicerideos'],
    [/\bast\b/g, 'tgo'],
    [/\balt\b/g, 'tgp']
  ];

  for (const [regex, rep] of replacements) {
    t = t.replace(regex, rep);
  }

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

function getAliases(exam) {
  return uniq([
    exam.nome,
    exam.codigo,
    ...safeParseAliases(exam.aliases)
  ]).map(normalizeExamText).filter(Boolean);
}

function similarity(a, b) {
  const x = normalizeExamText(a);
  const y = normalizeExamText(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.94;

  const ax = new Set(x.split(' ').filter(Boolean));
  const by = new Set(y.split(' ').filter(Boolean));
  const inter = [...ax].filter(v => by.has(v)).length;
  const union = new Set([...ax, ...by]).size || 1;
  const jaccard = inter / union;
  const lenPenalty = Math.min(x.length, y.length) / Math.max(x.length, y.length);

  return (jaccard * 0.75) + (lenPenalty * 0.25);
}

function findCandidates(term) {
  const txt = normalizeExamText(term);
  if (!txt) return [];

  const ranked = [];

  for (const exam of examCatalog) {
    const aliases = getAliases(exam);
    let bestScore = 0;
    let bestAlias = null;

    for (const alias of aliases) {
      let score = 0;

      if (alias === txt) score = 1;
      else if (txt.includes(alias) || alias.includes(txt)) score = 0.95;
      else score = similarity(txt, alias);

      if (score > bestScore) {
        bestScore = score;
        bestAlias = alias;
      }
    }

    if (bestScore >= 0.78) {
      ranked.push({ ...exam, _score: bestScore, alias_hit: bestAlias });
    }
  }

  ranked.sort((a, b) => b._score - a._score);

  const unique = [];
  const seen = new Set();

  for (const r of ranked) {
    const key = norm(r.nome);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }

  return unique;
}

function resolveOne(term) {
  const candidates = findCandidates(term);
  if (!candidates.length) return { status: 'not_found', term };

  const top = candidates[0];
  const second = candidates[1];

  if (!second) return { status: 'matched', exam: top, term };
  if (top._score >= 0.94) return { status: 'matched', exam: top, term };
  if ((top._score - second._score) >= 0.08 && top._score >= 0.86) {
    return { status: 'matched', exam: top, term };
  }

  return {
    status: 'ambiguous',
    term,
    options: candidates.slice(0, 5).map(c => c.nome)
  };
}

const text = normalizeExamText(mensagemOriginal);

const genericBudgetIntro = [
  'eu gostaria de fazer um orcamento',
  'eu gostaria de fazer um orÃ§amento',
  'gostaria de fazer um orcamento',
  'gostaria de fazer um orÃ§amento',
  'quero fazer um orcamento',
  'quero fazer um orÃ§amento',
  'preciso de um orcamento',
  'preciso de um orÃ§amento',
  'quero orcamento',
  'quero orÃ§amento',
  'orcamento',
  'orÃ§amento'
].includes(norm(mensagemOriginal));

const asksPrice = [
  'valor', 'preco', 'preÃ§o', 'quanto custa', 'qual o valor', 'orcamento', 'orÃ§amento'
].some(t => text.includes(norm(t)));

const asksPrep = [
  'preparo', 'jejum', 'precisa de jejum', 'tem jejum', 'qual o preparo'
].some(t => text.includes(norm(t)));

const asksTurnaround = [
  'prazo', 'quanto tempo demora', 'quando fica pronto', 'quantos dias'
].some(t => text.includes(norm(t)));

const asksSchedule = [
  'agendar', 'agendamento', 'marcar', 'agenda'
].some(t => text.includes(norm(t)));

const asksTotal = [
  'valor total', 'preco total', 'preÃ§o total', 'qual o total', 'me passe o total',
  'me passa o total', 'e o total', 'quanto fica tudo', 'total dos exames'
].some(t => text.includes(norm(t)));

const saysParticular = ['particular', 'sera particular', 'serÃ¡ particular', 'Ã© particular', 'eh particular'].includes(text);
const saysConvenio = ['convenio', 'convÃªnio', 'plano', 'plano de saude', 'plano de saÃºde'].some(t => text.includes(norm(t)));

const restrictedTerms = ['beta hcg', 'sexagem fetal', 'dna', 'teste de paternidade', 'paternidade'];
const hasRestrictedTerm = restrictedTerms.some(t => text.includes(norm(t)));

const currentTerms = Array.isArray(triage.exam_names_list) && triage.exam_names_list.length
  ? triage.exam_names_list.map(normalizeExamText)
  : [];

const snapshotExamNames = Array.isArray(ctx.budget_exam_names_list) ? ctx.budget_exam_names_list : [];
const snapshotResolved = Array.isArray(ctx.budget_resolved_exams) ? ctx.budget_resolved_exams : [];
const snapshotTotal = ctx.budget_total_snapshot || null;
const snapshotPaymentType = ctx.budget_payment_type || null;

let sourceTerms = [];

if (currentTerms.length) {
  sourceTerms = currentTerms;
} else if (!genericBudgetIntro && (asksPrice || asksPrep || asksTurnaround || asksTotal || saysParticular || saysConvenio)) {
  if (snapshotExamNames.length) sourceTerms = snapshotExamNames.map(normalizeExamText);
  else if (Array.isArray(ctx.last_exam_names_list) && ctx.last_exam_names_list.length) sourceTerms = ctx.last_exam_names_list.map(normalizeExamText);
  else if (ctx.last_exam_name_raw) sourceTerms = [normalizeExamText(ctx.last_exam_name_raw)];
}

sourceTerms = uniq(sourceTerms.filter(Boolean));

const matchedExams = [];
const unresolvedTerms = [];
const ambiguousTerms = [];
const seen = new Set();

for (const term of sourceTerms) {
  const result = resolveOne(term);

  if (result.status === 'matched') {
    const key = norm(result.exam.nome);
    if (!seen.has(key)) {
      seen.add(key);
      matchedExams.push(result.exam);
    }
  } else if (result.status === 'ambiguous') {
    ambiguousTerms.push(result);
  } else {
    unresolvedTerms.push(result.term);
  }
}

const restrictedByCatalog = matchedExams.some(e => Boolean(e.restrito));
const forceRestrictedHandoff = hasRestrictedTerm || restrictedByCatalog;

function formatMoney(v) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

function buildSnapshot(exams) {
  let totalKnown = 0;
  let totalFullyKnown = true;

  for (const exam of exams) {
    if (exam.valor !== null && exam.valor !== undefined && exam.pode_cotar_whatsapp !== false) {
      totalKnown += Number(exam.valor || 0);
    } else {
      totalFullyKnown = false;
    }
  }

  return {
    names: exams.map(e => e.nome).filter(Boolean),
    resolved: exams.map(examToSafe),
    total: totalFullyKnown ? formatMoney(totalKnown) : null
  };
}

let budgetSnapshot = {
  names: snapshotExamNames,
  resolved: snapshotResolved,
  total: snapshotTotal
};

if (matchedExams.length) {
  budgetSnapshot = buildSnapshot(matchedExams);
}

let ai_reply_override = null;
let force_handoff = false;
let force_handoff_category = null;
let force_response_status = 'answered';

if (genericBudgetIntro) {
  ai_reply_override = 'Claro! Para montar seu orÃ§amento certinho, por favor, me informe quais exames vocÃª deseja fazer.';
} else if (forceRestrictedHandoff) {
  ai_reply_override = 'Esse atendimento precisa ser conduzido por um atendente da Bio AnÃ¡lise. Vou encaminhar sua solicitaÃ§Ã£o para nossa equipe, tudo bem?';
  force_handoff = true;
  force_handoff_category = 'restricted_exam';
  force_response_status = 'handoff_ready';
} else if (ambiguousTerms.length > 0) {
  ai_reply_override = 'Para te passar a informaÃ§Ã£o correta, vou encaminhar esse atendimento para um atendente confirmar o nome do exame com seguranÃ§a.';
  force_handoff = true;
  force_handoff_category = 'exam_name_unclear';
  force_response_status = 'handoff_ready';
} else if (unresolvedTerms.length > 0) {
  ai_reply_override = 'Para nÃ£o te passar nenhuma informaÃ§Ã£o errada, vou encaminhar esse atendimento para um atendente confirmar o exame corretamente no sistema.';
  force_handoff = true;
  force_handoff_category = 'exam_name_unclear';
  force_response_status = 'handoff_ready';
} else if (!matchedExams.length) {
  ai_reply_override = 'Pode me informar os nomes dos exames que vocÃª deseja verificar?';
  force_response_status = 'need_clarification';
} else {
  const includePrice = asksPrice || asksTotal || triage.intent === 'orcamento' || triage.intent === 'valor' || triage.intent === 'valor_total' || saysParticular || saysConvenio;
  const includePrep = asksPrep || triage.intent === 'preparo_exame' || triage.intent === 'preparo_e_valor';
  const includeTurnaround = asksTurnaround || triage.intent === 'prazo';
  const includeSchedule = asksSchedule || triage.intent === 'agendamento';

  if (matchedExams.length > 1 && includePrice) {
    const lines = ['Claro!'];
    let totalKnown = 0;
    let totalFullyKnown = true;

    for (const exam of matchedExams) {
      if (exam.valor !== null && exam.valor !== undefined && exam.pode_cotar_whatsapp !== false) {
        lines.push(`â€¢ ${exam.nome}: *${formatMoney(exam.valor)}*`);
        totalKnown += Number(exam.valor || 0);
      } else {
        lines.push(`â€¢ ${exam.nome}: *valor sob confirmaÃ§Ã£o*`);
        totalFullyKnown = false;
      }
    }

    if (totalFullyKnown) {
      lines.push(`*Total:* ${formatMoney(totalKnown)}`);
    } else {
      lines.push(`*Total:* alguns valores dependem de confirmaÃ§Ã£o da equipe.`);
    }

    if (saysConvenio || snapshotPaymentType === 'convenio') {
      lines.push('Me informa o nome do convÃªnio para eu seguir com a verificaÃ§Ã£o.');
    } else if (!saysParticular && snapshotPaymentType !== 'particular') {
      lines.push('SerÃ¡ particular ou por convÃªnio?');
    }

    ai_reply_override = lines.join('\n');
  } else if (matchedExams.length > 1 && (includePrep || includeTurnaround || includeSchedule)) {
    const lines = ['Encontrei estes exames no seu pedido:'];

    for (const exam of matchedExams) {
      const parts = [`â€¢ *${exam.nome}*`];

      if (includePrep) {
        if (exam.precisa_jejum === true) {
          parts.push(exam.horas_jejum ? `Jejum: ${exam.horas_jejum}h` : 'Jejum: necessÃ¡rio');
        } else if (exam.precisa_jejum === false) {
          parts.push('Jejum: nÃ£o exige');
        }
        if (exam.preparo) parts.push(`Preparo: ${exam.preparo}`);
      }

      if (includeTurnaround) {
        parts.push(`Prazo: ${exam.prazo_entrega || 'confirmar com a equipe'}`);
      }

      if (includeSchedule) {
        if (exam.precisa_agendamento === true) parts.push('Agendamento: necessÃ¡rio');
        else if (exam.precisa_agendamento === false) parts.push('Agendamento: nÃ£o exige');
      }

      lines.push(parts.join(' | '));
    }

    ai_reply_override = lines.join('\n');
  } else if (matchedExams.length === 1) {
    const exam = matchedExams[0];
    const parts = [`Encontrei o exame de *${exam.nome}*.`];

    if (includePrice) {
      if (exam.valor !== null && exam.valor !== undefined && exam.pode_cotar_whatsapp !== false) {
        parts.push(`O valor particular Ã© *${formatMoney(exam.valor)}*.`);
      } else {
        parts.push('O valor desse exame precisa ser confirmado com nossa equipe.');
      }
    }

    if (includePrep) {
      if (exam.precisa_jejum === true) {
        parts.push(exam.horas_jejum ? `Ã‰ necessÃ¡rio jejum de *${exam.horas_jejum} horas*.` : 'Esse exame precisa de jejum.');
      } else if (exam.precisa_jejum === false) {
        parts.push('Esse exame *nÃ£o exige jejum*.');
      }
      if (exam.preparo) parts.push(`Preparo: ${exam.preparo}`);
    }

    if (includeTurnaround) {
      parts.push(`Prazo de entrega: *${exam.prazo_entrega || 'confirmar com a equipe'}*.`);
    }

    if (includeSchedule) {
      if (exam.precisa_agendamento === true) parts.push('Esse exame precisa de agendamento.');
      else if (exam.precisa_agendamento === false) parts.push('Esse exame nÃ£o exige agendamento prÃ©vio.');
      else parts.push('Posso te orientar sobre o agendamento desse exame.');
    }

    if (!includePrice && !includePrep && !includeTurnaround && !includeSchedule) {
      parts.push('Posso te ajudar com valor, preparo, jejum, prazo ou agendamento.');
    }

    ai_reply_override = parts.join(' ');
  } else {
    ai_reply_override = `Identifiquei estes exames: *${matchedExams.map(e => e.nome).join(', ')}*. Posso te passar valor, preparo, prazo ou jÃ¡ seguir para o agendamento.`;
  }
}

const prompt_sistema = `
VocÃª Ã© o subagente de Exames e Preparo da Bio AnÃ¡lise.

Regras:
- Use somente os dados de safe_data.
- Nunca invente valor, preparo, jejum, prazo ou agendamento.
- Se o exame nÃ£o ficar 100% seguro, nÃ£o chute e nÃ£o complete parcialmente.
- Nesses casos, encaminhe para humano.
- Quando houver mÃºltiplos exames, trate como orÃ§amento em andamento.
- Use budget_exam_names_list, budget_resolved_exams e budget_total_snapshot como fonte oficial de follow-up.
- Responda de forma humana, clara, natural e organizada.
`;

return [{
  json: {
    ...input,
    subagente: 'exames_preparo',
    prompt_sistema,
    mensagem_original: mensagemOriginal,
    mensagem_normalizada: text,
    parece_consulta_exame: Boolean(matchedExams.length || triage.intent === 'consulta_exame' || triage.intent === 'orcamento'),
    precisa_confirmacao: false,
    eh_restrito: forceRestrictedHandoff,
    force_handoff,
    force_handoff_category,
    force_response_status,
    safe_data: {
      exam_found: matchedExams.length > 0,
      exam_count: matchedExams.length,
      exame: matchedExams[0] ? examToSafe(matchedExams[0]) : null,
      exames: matchedExams.map(examToSafe),
      exam_names_list: budgetSnapshot.names,
      budget_mode_active: budgetSnapshot.names.length > 1,
      budget_payment_type: saysParticular ? 'particular' : (saysConvenio ? 'convenio' : snapshotPaymentType),
      budget_exam_names_list: budgetSnapshot.names,
      budget_resolved_exams: budgetSnapshot.resolved,
      budget_total_snapshot: budgetSnapshot.total,
      unresolved_terms: unresolvedTerms,
      ambiguous_terms: ambiguousTerms
    },
    ai_reply_override,
    conversation_context: {
      ...ctx,
      last_exam_name_raw: budgetSnapshot.names[0] || ctx.last_exam_name_raw || null,
      last_exam_names_list: budgetSnapshot.names.length ? budgetSnapshot.names : (ctx.last_exam_names_list || []),
      budget_mode_active: budgetSnapshot.names.length > 1,
      budget_payment_type: saysParticular ? 'particular' : (saysConvenio ? 'convenio' : snapshotPaymentType),
      budget_exam_names_list: budgetSnapshot.names,
      budget_resolved_exams: budgetSnapshot.resolved,
      budget_total_snapshot: budgetSnapshot.total,
      collect_field: null,
      ambiguous_exam_query: null,
      ambiguous_exam_options: []
    }
  }
}];
