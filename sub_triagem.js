const item = $input.item.json;
const text = (item.normalized_text || '').trim();
const restricted = item.restricted_topics || ['beta hcg','sexagem fetal','dna'];
const ctx = item.conversation_context || {};

const has = (terms) => terms.some(t => text.includes(t));

function norm(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[?.,!;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanExamName(v) {
  return norm(v)
    .replace(/^exame de\s+/i, '')
    .replace(/^exame\s+/i, '')
    .replace(/^um exame de\s+/i, '')
    .replace(/^um exame\s+/i, '')
    .replace(/^o exame de\s+/i, '')
    .replace(/^o exame\s+/i, '')
    .trim();
}

function normalizeExamAliases(v) {
  const exam = cleanExamName(v);

  if (!exam) return exam;
  if (['urina simples', 'exame de urina simples', 'urina tipo 1', 'urina tipo i'].includes(exam)) return 'eas';
  if (exam === 'beta-hcg') return 'beta hcg';
  if (exam === 'rubela') return 'rubeola';
  if (exam === 't4l') return 't4 livre';
  if (exam === 'creatina') return 'creatinina';
  if (exam === 'cbc') return 'hemograma completo';
  if (exam === 'fosforo') return 'fosforo';

  return exam;
}

const GREETING_ONLY = [
  'oi','ola','olÃ¡','bom dia','boa tarde','boa noite','tudo bem','hey','e ai','e aÃ­'
].map(norm);

const ACK_ONLY = [
  'ok','certo','entendi','sim','beleza','perfeito','otimo','Ã³timo','combinado','blz','show','recebi'
].map(norm);

const FAREWELL_ONLY = [
  'tchau','obrigado','obrigada','ate logo','atÃ© logo','valeu','muito obrigado','muito obrigada'
].map(norm);

const NON_EXAM_SHORT_MESSAGES = new Set([
  ...GREETING_ONLY,
  ...ACK_ONLY,
  ...FAREWELL_ONLY
]);

function looksLikeStandaloneExamCandidate(value) {
  const v = norm(value);
  if (!v) return false;

  if (NON_EXAM_SHORT_MESSAGES.has(v)) return false;

  const blocked = [
    'quero fazer',
    'preciso fazer',
    'gostaria de fazer',
    'valor',
    'preco',
    'preÃ§o',
    'orcamento',
    'orÃ§amento',
    'agendamento',
    'agendar',
    'marcar',
    'preparo',
    'jejum',
    'prazo',
    'resultado',
    'endereco',
    'endereÃ§o',
    'telefone',
    'whatsapp',
    'instagram',
    'convenio',
    'convÃªnio',
    'particular',
    'na verdade',
    'sao tres exames',
    'sÃ£o trÃªs exames',
    'tres exames',
    'trÃªs exames'
  ].map(norm);

  if (blocked.includes(v)) return false;

  const knownShortExamForms = [
    't3','t4','tsh','vdrl','eas','epf','hcg','beta hcg',
    't3 livre','t4 livre','gama gt','tgo','tgp',
    'urina simples','urina tipo 1','urina tipo i',
    'calcio','cÃ¡lcio','t4l','fosforo','fÃ³sforo'
  ].map(norm);

  if (knownShortExamForms.includes(v)) return true;

  if (v.length <= 2) return false;
  if (v.split(' ').length > 6) return false;

  return /^[a-z0-9\s\-]{2,50}$/.test(v);
}

function detectAgent() {
  const map = {
    adriana: 'Adriana',
    kaleby: 'Kaleby',
    kaleb: 'Kaleb',
    cida: 'Cida',
    'dr omar': 'Dr. Omar',
    'doutor omar': 'Dr. Omar',
    omar: 'Dr. Omar'
  };

  for (const [alias, name] of Object.entries(map)) {
    if (text.includes(alias)) return name;
  }

  return null;
}

function splitPotentialExams(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  const normalizedLines = raw
    .replace(/\r/g, '\n')
    .split('\n')
    .map(v => v.trim())
    .filter(Boolean);

  const parts = [];

  for (const line of normalizedLines) {
    const cleaned = line
      .replace(/^[-â€¢*]\s*/g, '')
      .replace(/^\d+[.)-]?\s*/g, '')
      .trim();

    const lower = norm(cleaned);

    if (!lower) continue;

    if (
      lower.startsWith('exame de ') ||
      lower.startsWith('exame ') ||
      looksLikeStandaloneExamCandidate(lower)
    ) {
      parts.push(cleaned);
      continue;
    }

    cleaned
      .split(/\s*,\s*|\s*;\s*|\s*\/\s*/g)
      .map(v => v.trim())
      .filter(Boolean)
      .forEach(v => parts.push(v));
  }

  return [...new Set(
    parts
      .map(v => normalizeExamAliases(v))
      .filter(Boolean)
      .filter(looksLikeStandaloneExamCandidate)
  )];
}

function extractExamTerms() {
  const terms = new Set();
  const raw = String(item.message_text || item.mensagem_original || item.text || item.body || '').trim();
  const rawNorm = norm(raw);

  // 1) Linhas explÃ­citas: "Exame de Ureia"
  raw
    .replace(/\r/g, '\n')
    .split('\n')
    .map(v => v.trim())
    .filter(Boolean)
    .forEach(line => {
      const cleanLine = line
        .replace(/^[-â€¢*]\s*/g, '')
        .replace(/^\d+[.)-]?\s*/g, '')
        .trim();

      if (/^exame de /i.test(cleanLine) || /^exame /i.test(cleanLine)) {
        const cleaned = normalizeExamAliases(cleanLine);
        if (looksLikeStandaloneExamCandidate(cleaned)) {
          terms.add(cleaned);
        }
      }
    });

  // 2) RepetiÃ§Ãµes "um exame de X, um exame de Y, um exame de Z"
  const repeatedExamRegex = /(?:^|,|\be\b|\n)\s*(?:um\s+)?exame\s+de\s+([a-z\u00e0-\u00fa0-9\s\-\/\(\)]+?)(?=(?:,|\be\b|\n|$))/gi;
  for (const m of raw.matchAll(repeatedExamRegex)) {
    if (m[1]) {
      const cleaned = normalizeExamAliases(m[1]);
      if (looksLikeStandaloneExamCandidate(cleaned)) {
        terms.add(cleaned);
      }
    }
  }

  // 3) "quero fazer X, Y, Z"
  const listAfterIntentRegex = /(?:quero fazer|preciso fazer|gostaria de fazer|quero verificar|preciso verificar|gostaria de verificar)\s+(.+)/i;
  const intentMatch = raw.match(listAfterIntentRegex);
  if (intentMatch && intentMatch[1]) {
    splitPotentialExams(intentMatch[1]).forEach(term => {
      if (looksLikeStandaloneExamCandidate(term)) terms.add(term);
    });
  }

  // 4) Lista curta inteira
  if (rawNorm && rawNorm.length <= 220) {
    splitPotentialExams(raw).forEach(term => {
      if (looksLikeStandaloneExamCandidate(term)) terms.add(term);
    });
  }

  return [...terms];
}

// â”€â”€ confirmaÃ§Ã£o de exame ambÃ­guo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (ctx.collect_field === 'confirmar_exame') {
  const options = Array.isArray(ctx.ambiguous_exam_options) ? ctx.ambiguous_exam_options : [];
  const inputNorm = norm(text);

  const matched = options.find(opt => {
    const optNorm = norm(opt);
    return optNorm === inputNorm || optNorm.includes(inputNorm) || inputNorm.includes(optNorm);
  });

  if (matched) {
    return [{
      json: {
        ...item,
        triage: {
          intent: ctx.last_intent === 'agendamento' ? 'agendamento' : 'consulta_exame',
          confidence: 0.99,
          urgency: 'normal',
          exam_name_raw: matched,
          exam_names_list: [matched],
          needs_human: false,
          requested_agent_name: null,
          reason_codes: ['ambiguous_exam_confirmed'],
          signals: {
            ambiguous_exam_confirmed: true
          }
        },
        conversation_context: {
          ...ctx,
          collect_field: null,
          ambiguous_exam_query: null,
          ambiguous_exam_options: []
        }
      }
    }];
  }

  return [{
    json: {
      ...item,
      triage: {
        intent: ctx.last_intent === 'agendamento' ? 'agendamento' : 'consulta_exame',
        confidence: 0.85,
        urgency: 'normal',
        exam_name_raw: text,
        exam_names_list: splitPotentialExams(text),
        needs_human: false,
        requested_agent_name: null,
        reason_codes: ['ambiguous_exam_confirmation_retry'],
        signals: {
          ambiguous_exam_confirmation_retry: true
        }
      }
    }
  }];
}

const hasImgCtx = Array.isArray(ctx.last_image_exams_list) && ctx.last_image_exams_list.length > 0;
const refersPrev = [
  'esses','esses exames','esses ai','esses aÃ­','da imagem','do pedido','desses exames'
].includes(text);

if (refersPrev && hasImgCtx) {
  const examsText = ctx.last_image_exams_text || ctx.last_image_exams_list.join(', ');
  return [{
    json: {
      ...item,
      message_text: `Tenho um pedido medico com os seguintes exames: ${examsText}. Quero saber o preparo e os valores.`,
      normalized_text: `tenho um pedido medico com os seguintes exames ${examsText} quero saber o preparo e os valores`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''),
      triage: {
        intent: 'preparo_e_valor',
        confidence: 0.96,
        urgency: 'normal',
        exam_name_raw: ctx.last_image_exams_list[0] || examsText,
        exam_names_list: ctx.last_image_exams_list,
        needs_human: false,
        requested_agent_name: null,
        reason_codes: ['image_ctx_reused'],
        signals: {}
      }
    }
  }];
}

const s = {
  mentions_restricted: has(restricted),
  asks_human: has([
    'quero falar com atendente','falar com atendente','chamar atendente',
    'atendimento humano','falar com alguem','falar com uma pessoa',
    'me passa para atendente','chama atendente'
  ]),
  asks_named_agent: Boolean(detectAgent()),
  complaint: has(['reclamacao','reclamar','insatisfeito','insatisfeita','pessimo','horrivel','vergonha']),
  asks_result: has(['resultado','ficou pronto','laudo','pegar resultado','meu resultado']),
  asks_schedule: has([
    'agendar','marcar','agenda','quero marcar','quero agendar','como agendar','horario disponivel'
  ]),
  asks_do_exam: has([
    'quero fazer exame','quero fazer um exame','fazer exame','fazer um exame',
    'quero fazer','preciso fazer exame','meu medico me passou','meu mÃ©dico me passou'
  ]),
  asks_total_price: has([
    'valor total','preco total','total dos exames','quanto fica tudo',
    'total geral','valor final','qual o total','qual o total dos dois','soma dos exames'
  ]),
  asks_price: has([
    'preco','valor','custa','quanto custa','quanto e','qual o valor',
    'qual o preco','quanto fica','tabela de precos','valores dos exames','valor dos exames',
    'orcamento','orÃ§amento'
  ]),
  asks_convenio: has([
    'convenio','plano de saude','plano','unimed','bradesco saude','aceita plano',
    'faz pelo plano','ipasgo','cassi','caesan','postal saude','itau saude'
  ]),
  asks_prep: has([
    'preparo','jejum','como fazer o exame','preciso de jejum','o que preciso fazer',
    'posso comer antes','tem preparo','qual o preparo'
  ]),
  asks_generic_blood_fasting: has([
    'exame de sangue qual o jejum',
    'exame de sangue qual o preparo',
    'para fazer exame de sangue qual o jejum',
    'para exame de sangue precisa de jejum',
    'exame de sangue precisa de jejum',
    'qual jejum para exame de sangue',
    'jejum para exame de sangue',
    'precisa de jejum para exame de sangue'
  ]),
  asks_turnaround: has([
    'prazo','quanto tempo demora','quando fica pronto','quantos dias',
    'quando sai o resultado','entrega no mesmo dia'
  ]),
  asks_hours: has([
    'horario','horarios','hora de coleta','funciona','abre','fecha',
    'que horas','horario de funcionamento','quando abre','quando fecha'
  ]),
  asks_address: has([
    'endereco','onde fica','localizacao','como chegar','qual o endereco','onde voces ficam'
  ]),
  asks_contact: has(['telefone','whatsapp','email','instagram','contato','numero']),
  asks_catalog: has([
    'qual tipo de exame','quais exames','que exames','tipos de exame',
    'fazem exame de','exames disponiveis','que servicos'
  ]),
  asks_collection_home: has([
    'coleta em casa',
    'coleta domiciliar',
    'em domicilio',
    'em domicÃ­lio',
    'fazer em casa',
    'faz coleta em casa',
    'coleta na minha casa',
    'colher em casa',
    'vai em casa',
    'vocÃªs vÃ£o em casa',
    'voces vao em casa',
    'atendimento em casa'
  ]),
  asks_collection: has([
    'coleta',
    'coletar',
    'coleta em casa',
    'coleta domiciliar',
    'coleta na clinica',
    'coleta na clÃ­nica'
  ]),
  unsure_exam: has([
    'nao sei o nome do exame','nao sei qual exame','nao lembro o nome','exame la','aquele exame'
  ]),
  is_greeting: has(['ola','oi','bom dia','boa tarde','boa noite','tudo bem','como vai','hey']),
  is_ack: has(['ok','certo','entendi','sim','beleza','perfeito','otimo','combinado','blz','show','recebi']),
  is_farewell: has(['tchau','obrigado','obrigada','ate logo','valeu','muito obrigado'])
};

const agent = detectAgent();

const extractedExamTerms = extractExamTerms();
const contextExamNamesList = Array.isArray(ctx.last_exam_names_list) ? ctx.last_exam_names_list : [];
const normalizedContextExamNamesList = contextExamNamesList.map(v => normalizeExamAliases(v)).filter(Boolean);

let exam_names_list = [...new Set(extractedExamTerms)];

if (!exam_names_list.length && hasImgCtx) {
  exam_names_list = [...new Set((ctx.last_image_exams_list || []).map(v => normalizeExamAliases(v)).filter(Boolean))];
}

const hasExamContext = Boolean(ctx.last_exam_name_raw) || normalizedContextExamNamesList.length > 0;
const examContextName = ctx.last_exam_name_raw || null;

const isDatePattern = /\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/.test(text);
const isTimePattern = /\b\d{1,2}h\b|\b\d{1,2}:\d{2}\b/.test(text);
const isDayKeyword = /\b(segunda|terca|terÃ§a|terca-feira|terÃ§a-feira|quarta|quinta|sexta|sabado|sÃ¡bado|domingo|amanha|amanhÃ£|hoje|proxima|prÃ³xima|semana que vem)\b/.test(text);
const isShortReply = text.length > 0 && text.length <= 160;

const schedulingCollectFields = [
  'nome_completo',
  'nome_exame',
  'data_preferida',
  'horario_preferido',
  'tipo_coleta',
  'endereco_coleta'
];

const explicitSchedulingContext =
  ctx.last_intent === 'agendamento' &&
  schedulingCollectFields.includes(ctx.collect_field || '') &&
  !s.mentions_restricted &&
  !s.complaint &&
  !s.asks_human &&
  !s.asks_named_agent &&
  !s.is_farewell;

const looksLikeDateOrTime =
  isDatePattern ||
  isTimePattern ||
  isDayKeyword;

const looksLikeExamReplyInScheduling =
  explicitSchedulingContext &&
  (ctx.collect_field === 'nome_exame') &&
  (
    exam_names_list.length > 0 ||
    hasExamContext
  );

const shouldStayInScheduling =
  explicitSchedulingContext &&
  (
    looksLikeDateOrTime ||
    s.is_ack ||
    looksLikeExamReplyInScheduling ||
    (isShortReply && !s.asks_price && !s.asks_prep && !s.asks_turnaround)
  );

const isExamFollowUp =
  hasExamContext &&
  !s.asks_schedule &&
  !s.asks_collection_home &&
  !explicitSchedulingContext &&
  !s.mentions_restricted &&
  !s.complaint &&
  !s.asks_human &&
  !s.asks_named_agent &&
  (
    s.asks_price ||
    s.asks_prep ||
    s.asks_total_price ||
    s.asks_turnaround ||
    text === 'qual o valor' ||
    text === 'valor' ||
    text === 'preco' ||
    text === 'preÃ§o' ||
    text === 'qual o preparo' ||
    text === 'precisa de jejum' ||
    text === 'tem jejum' ||
    text === 'qual o prazo'
  );

if (looksLikeExamReplyInScheduling) {
  return [{
    json: {
      ...item,
      triage: {
        intent: 'agendamento',
        confidence: 0.98,
        urgency: 'normal',
        exam_name_raw: exam_names_list[0] || examContextName || normalizedContextExamNamesList[0] || null,
        exam_names_list: exam_names_list.length ? exam_names_list : (normalizedContextExamNamesList.length ? normalizedContextExamNamesList : (examContextName ? [examContextName] : [])),
        needs_human: false,
        requested_agent_name: null,
        reason_codes: ['scheduling_exam_reply'],
        signals: {
          ...s,
          scheduling_exam_reply: true
        }
      }
    }
  }];
}

if (isExamFollowUp) {
  let followIntent = 'valor';

  if (s.asks_prep && s.asks_price) followIntent = 'preparo_e_valor';
  else if (s.asks_prep) followIntent = 'preparo_exame';
  else if (s.asks_total_price) followIntent = 'valor_total';
  else if (s.asks_turnaround) followIntent = 'prazo';
  else if (s.asks_price) followIntent = 'valor';

  return [{
    json: {
      ...item,
      triage: {
        intent: followIntent,
        confidence: 0.97,
        urgency: 'normal',
        exam_name_raw: examContextName || normalizedContextExamNamesList[0] || null,
        exam_names_list: normalizedContextExamNamesList.length ? normalizedContextExamNamesList : (examContextName ? [examContextName] : []),
        needs_human: false,
        requested_agent_name: null,
        reason_codes: ['exam_context_follow_up'],
        signals: {
          ...s,
          exam_context_follow_up: true
        }
      }
    }
  }];
}

const reasons = [];
let intent = 'desconhecido';
let conf = 0.55;

const asksHomeCollectionAndSchedule =
  s.asks_collection_home &&
  (s.asks_schedule || looksLikeDateOrTime || has(['quero','preciso','gostaria']));

const mixedPriceAndSchedule =
  (s.asks_price || s.asks_total_price) &&
  (s.asks_schedule || looksLikeDateOrTime);

if (s.mentions_restricted) {
  intent = 'restrito';
  conf = 0.99;
  reasons.push('restricted_topic');
}
else if (s.complaint) {
  intent = 'reclamacao';
  conf = 0.97;
  reasons.push('complaint');
}
else if (s.asks_human || s.asks_named_agent) {
  intent = 'humano';
  conf = 0.96;
  reasons.push('human_requested');
  if (agent) reasons.push('named_agent');
}
else if (s.unsure_exam) {
  intent = 'duvida_nome_exame';
  conf = 0.92;
  reasons.push('exam_name_uncertain');
}
else if (s.asks_result) {
  intent = 'resultado';
  conf = 0.93;
  reasons.push('result_detected');
}
else if (asksHomeCollectionAndSchedule) {
  intent = 'agendamento';
  conf = 0.97;
  reasons.push('home_collection_schedule');
}
else if (s.asks_collection_home) {
  intent = 'coleta_domiciliar';
  conf = 0.97;
  reasons.push('home_collection_info');
}
else if (mixedPriceAndSchedule) {
  intent = 'agendamento';
  conf = 0.96;
  reasons.push('mixed_price_and_schedule');
}
else if (s.asks_schedule || shouldStayInScheduling) {
  intent = 'agendamento';
  conf = 0.92;
  reasons.push(s.asks_schedule ? 'scheduling' : 'scheduling_ctx_follow_up');
}
else if (s.asks_prep && s.asks_total_price) {
  intent = 'preparo_e_valor_total';
  conf = 0.95;
  reasons.push('prep_and_total');
}
else if (s.asks_total_price) {
  intent = 'valor_total';
  conf = 0.94;
  reasons.push('total_price');
}
else if (s.asks_prep && s.asks_price) {
  intent = 'preparo_e_valor';
  conf = 0.93;
  reasons.push('prep_and_price');
}
else if (s.asks_generic_blood_fasting) {
  intent = 'preparo_generico_sangue';
  conf = 0.95;
  reasons.push('generic_blood_fasting');
}
else if (s.asks_prep) {
  intent = 'preparo_exame';
  conf = 0.90;
  reasons.push('prep');
}
else if (s.asks_price) {
  intent = 'valor';
  conf = 0.92;
  reasons.push('price');
}
else if (s.asks_turnaround) {
  intent = 'prazo';
  conf = 0.86;
  reasons.push('turnaround');
}
else if (s.asks_convenio) {
  intent = 'convenio';
  conf = 0.91;
  reasons.push('insurance');
}
else if (s.asks_hours) {
  intent = 'horario';
  conf = 0.94;
  reasons.push('hours');
}
else if (s.asks_address) {
  intent = 'endereco';
  conf = 0.93;
  reasons.push('address');
}
else if (s.asks_contact || s.asks_catalog || s.asks_collection) {
  intent = 'institucional';
  conf = 0.92;
  reasons.push('institutional');
}
else if (exam_names_list.length > 0 && (s.asks_do_exam || text.length <= 220)) {
  intent = explicitSchedulingContext ? 'agendamento' : 'consulta_exame';
  conf = exam_names_list.length > 1 ? 0.96 : 0.91;
  reasons.push(explicitSchedulingContext ? 'scheduling_exam_continuation' : (exam_names_list.length > 1 ? 'multi_exam_query' : 'direct_exam_query'));
}
else if (s.is_greeting || s.is_ack) {
  intent = 'saudacao';
  conf = 0.95;
  reasons.push('greeting');
}
else if (s.is_farewell) {
  intent = 'despedida';
  conf = 0.94;
  reasons.push('farewell');
}
else if (isShortReply && explicitSchedulingContext && looksLikeDateOrTime) {
  intent = 'agendamento';
  conf = 0.88;
  reasons.push('scheduling_short_follow_up');
}

if (exam_names_list.length > 0) {
  reasons.push('exam_names_extracted');
}

const exam_name_raw =
  exam_names_list[0] ||
  examContextName ||
  normalizedContextExamNamesList[0] ||
  null;

const final_exam_names_list =
  exam_names_list.length > 0
    ? exam_names_list
    : (
        normalizedContextExamNamesList.length > 0
          ? normalizedContextExamNamesList
          : (examContextName ? [examContextName] : [])
      );

const needs_human =
  s.mentions_restricted ||
  s.complaint ||
  s.asks_human ||
  s.asks_named_agent ||
  s.unsure_exam ||
  s.asks_result;

return [{
  json: {
    ...item,
    triage: {
      intent,
      confidence: conf,
      urgency: s.complaint ? 'high' : 'normal',
      exam_name_raw,
      exam_names_list: final_exam_names_list,
      needs_human,
      requested_agent_name: agent,
      reason_codes: reasons,
      signals: {
        ...s,
        multi_exam_detected: final_exam_names_list.length > 1,
        home_collection_detected: s.asks_collection_home
      }
    }
  }
}];
