const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n-workflows/Bio Análise - Atendimento WhatsApp.json', 'utf8'));

let triagemCode = '';
let agendamentoCode = '';

for (const node of data.nodes) {
  if (node.name === 'Subagente de Triagem') triagemCode = node.parameters.jsCode;
  if (node.name === 'Subagente Agendamento') agendamentoCode = node.parameters.jsCode;
}

function runTriagem(text, last_intent, collect_field) {
  const $input = {
    item: {
      json: {
        message_text: text,
        normalized_text: text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(),
        conversation_context: { last_intent, collect_field }
      }
    }
  };
  const fn = new Function('$input', triagemCode);
  return fn($input)[0].json;
}

function runAgendamento(triageOutput) {
  const $input = { item: { json: triageOutput } };
  const fn = new Function('$input', agendamentoCode);
  return fn($input)[0].json;
}

console.log("=== TEST 1: user says 'será domiciliar' ===");
const t1 = runTriagem("será domiciliar", "agendamento", "tipo_coleta");
console.log("Triagem intent: ", t1.triage.intent);
const a1 = runAgendamento(t1);
console.log("Agendamento override: ", a1.ai_reply_override);
console.log("Agendamento collect: ", a1.conversation_context.collect_field);

console.log("\n=== TEST 2: user says 'coleta domiciliar' ===");
const t2 = runTriagem("coleta domiciliar", "agendamento", "tipo_coleta");
console.log("Triagem intent: ", t2.triage.intent);
const a2 = runAgendamento(t2);
console.log("Agendamento override: ", a2.ai_reply_override);
console.log("Agendamento collect: ", a2.conversation_context.collect_field);

console.log("\n=== TEST 3: user says 'sim' during coleta_domiciliar ===");
const t3 = runTriagem("sim", "coleta_domiciliar", null);
console.log("Triagem intent: ", t3.triage.intent);
