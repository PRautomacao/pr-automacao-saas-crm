const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n-workflows/Bio Análise - Atendimento WhatsApp.json', 'utf8'));

for (const node of data.nodes) {
  if (node.name === 'Subagente de Triagem') {
    let code = node.parameters.jsCode;
    
    const blockToReplace = `else if (asksHomeCollectionAndSchedule) {
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
}`;

    const newBlock = `else if (shouldStayInScheduling) {
  intent = 'agendamento';
  conf = 0.98;
  reasons.push('scheduling_ctx_follow_up');
}
else if (ctx.last_intent === 'coleta_domiciliar' && (s.is_ack || s.asks_schedule || s.asks_do_exam || has(['quero', 'pode sim', 'pode seguir']))) {
  intent = 'agendamento';
  conf = 0.95;
  reasons.push('agendamento_from_info');
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
else if (s.asks_schedule) {
  intent = 'agendamento';
  conf = 0.92;
  reasons.push('scheduling');
}`;

    code = code.replace(blockToReplace, newBlock);
    node.parameters.jsCode = code;
  }
  
  if (node.name === 'Subagente Agendamento') {
    let code = node.parameters.jsCode;
    
    // Replace detectTipoColeta block
    code = code.replace(/function detectTipoColeta\(text\) \{[\s\S]*?return null;\n\}/, 
`function detectTipoColeta(text) {
  const n = norm(text);
  if (
    n.includes('coleta em casa') ||
    n.includes('coleta domiciliar') ||
    n.includes('em domicilio') ||
    n.includes('em domicílio') ||
    n.includes('domiciliar') ||
    n.includes('em casa')
  ) return 'domiciliar';

  if (
    n.includes('na clinica') ||
    n.includes('na clínica') ||
    n.includes('na unidade') ||
    n.includes('clinica') ||
    n.includes('clínica')
  ) return 'clinica';

  return null;
}`);

    node.parameters.jsCode = code;
  }
}

fs.writeFileSync('n8n-workflows/Bio Análise - Atendimento WhatsApp.json', JSON.stringify(data, null, 2));
console.log("Updated flow routing in JSON.");
