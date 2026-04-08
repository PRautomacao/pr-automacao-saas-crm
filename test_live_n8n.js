const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n-workflows/Bio Análise - Atendimento WhatsApp.json', 'utf8'));

let triagemCode = '';
let examesCode = '';

for (const node of data.nodes) {
  if (node.name === 'Subagente de Triagem') triagemCode = node.parameters.jsCode;
  if (node.name === 'Subagente Exames e Preparo') examesCode = node.parameters.jsCode;
}

// Mock enviroment
function runTriagem(text) {
  let output = null;
  const $input = {
    item: {
      json: {
        message_text: text,
        normalized_text: text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(),
      }
    }
  };
  
  // Create a function from the code
  const fn = new Function('$input', triagemCode);
  return fn($input)[0].json;
}

function runExames(triageOutput, catalog) {
  const $json = triageOutput;
  const items = [{ json: { triage: triageOutput.triage, message_text: triageOutput.message_text, exam_catalog: catalog } }];
  
  const fn = new Function('items', examesCode);
  return fn(items)[0].json;
}

// Minimal mock catalog
const mockCatalog = [
  { nome: 'Ureia', aliases: '[]' },
  { nome: 'Creatinina', aliases: '["creatina"]' },
  { nome: 'Glicemia', aliases: '["glicose"]' },
  { nome: 'VDRL', aliases: '[]' },
  { nome: 'Dengue', aliases: '[]' }
];

console.log("=== TEST 1 ===");
const t1 = runTriagem("estou precisando fazer um exame de Ureia e um exame de Creatinina");
console.log("Triagem exams: ", t1.triage.exam_names_list);

const e1 = runExames(t1, mockCatalog);
console.log("Exames payload: ", e1.ai_reply_override);
console.log("Exam array from triage: ", e1.safe_data.exam_count);

console.log("\n=== TEST 2 ===");
const t2 = runTriagem("Glicemia, Ureia, VDRL e dengue");
console.log("Triagem exams: ", t2.triage.exam_names_list);

const e2 = runExames(t2, mockCatalog);
console.log("Exames payload: ", e2.ai_reply_override);

