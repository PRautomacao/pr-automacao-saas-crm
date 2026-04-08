const cases = [
  "estou precisando fazer um exame de Ureia e um exame de Creatinina",
  "preciso fazer um exame de Glicemia, Ureia, VDRL e dengue",
  "eu falo para ele que eu preciso fazer um exame de Glicemia, Ureia, VDRL e dengue",
  "glicemia, ureia, vdrl e dengue",
  "um exame de beta hcg",
  "fazer hemograma completo e urina tipo 1"
];

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
    .replace(/^exames?\s+de\s+/i, '')
    .replace(/^o\s+exame\s+de\s+/i, '')
    .replace(/^os\s+exames\s+de\s+/i, '')
    .replace(/^um\s+exame\s+de\s+/i, '')
    .replace(/^uns\s+exames\s+de\s+/i, '')
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

function looksLikeStandaloneExamCandidate(value) {
  const v = norm(value);
  if (!v) return false;
  const blocked = [
    'quero fazer','preciso fazer','gostaria de fazer','valor','preco','preço','orcamento','orçamento',
    'agendamento','agendar','marcar','preparo','jejum','prazo','resultado','endereco','endereço',
    'telefone','whatsapp','instagram','convenio','convênio','particular','na verdade',
    'sao tres exames','são três exames','tres exames','três exames', 'exame', 'exames'
  ].map(norm);
  if (blocked.includes(v)) return false;
  const knownShortExamForms = ['t3','t4','tsh','vdrl','eas','epf','hcg','beta hcg','t3 livre','t4 livre','gama gt','tgo','tgp','urina simples','urina tipo 1','urina tipo i','calcio','cálcio','t4l','fosforo','fósforo'].map(norm);
  if (knownShortExamForms.includes(v)) return true;
  if (v.length <= 2) return false;
  if (v.split(' ').length > 6) return false;
  return /^[a-z0-9\s\-]{2,50}$/.test(v);
}

function splitPotentialExams(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];
  
  // Replace " e " with "," to split uniformly 
  const replacedE = raw.replace(/\b e \b/gi, ',');
  const normalizedLines = replacedE.replace(/\r/g, '\n').split('\n').map(v => v.trim()).filter(Boolean);
  const parts = [];

  for (const line of normalizedLines) {
    const cleaned = line.replace(/^[-•*]\s*/g, '').replace(/^\d+[.)-]?\s*/g, '').trim();
    const lower = norm(cleaned);
    if (!lower) continue;

    // split by comma or semi-colon
    cleaned.split(/\s*,\s*|\s*;\s*|\s*\/\s*/g).map(v => v.trim()).filter(Boolean).forEach(v => {
      // Remove starting prefixes like "exame de " from EACH split part
      const stripped = cleanExamName(v);
      if (stripped) parts.push(stripped);
    });
  }

  return [...new Set(
    parts
      .map(v => normalizeExamAliases(v))
      .filter(Boolean)
      .filter(looksLikeStandaloneExamCandidate)
  )];
}

function extractExamTerms(rawMsg) {
  const terms = new Set();
  const raw = String(rawMsg || '').trim();
  const rawNorm = norm(raw);

  // 1) Explicit lines
  raw.replace(/\r/g, '\n').split('\n').map(v => v.trim()).filter(Boolean).forEach(line => {
    const cleanLine = line.replace(/^[-•*]\s*/g, '').replace(/^\d+[.)-]?\s*/g, '').trim();
    if (/^exames? /i.test(cleanLine)) {
       splitPotentialExams(cleanLine).forEach(t => terms.add(t));
    }
  });

  // 2) Repeated "um exame de X, um exame de Y, um exame de Z"
  const repeatedExamRegex = /(?:(?:um|uns)\s+)?exames?\s+de\s+([a-z\u00e0-\u00fa0-9\s\-\/\(\)]+?)(?=(?:,|\be\b|\n|$|(?:um|uns)\s+exames?\s+de))/gi;
  for (const m of raw.matchAll(repeatedExamRegex)) {
    if (m[1]) {
      splitPotentialExams(m[1]).forEach(t => terms.add(t));
    }
  }

  // 3) Intent list "quero fazer X, Y, Z"
  const listAfterIntentRegex = /(?:quero fazer|preciso fazer|gostaria de fazer|quero verificar|preciso verificar|gostaria de verificar)\s+(.+)/i;
  const intentMatch = raw.match(listAfterIntentRegex);
  if (intentMatch && intentMatch[1]) {
    splitPotentialExams(intentMatch[1]).forEach(term => terms.add(term));
  }

  // 4) Short raw message
  if (rawNorm && rawNorm.length <= 220) {
    splitPotentialExams(raw).forEach(term => terms.add(term));
  }

  return [...terms];
}

cases.forEach(c => {
  console.log("-> " + c);
  console.log(extractExamTerms(c));
});
