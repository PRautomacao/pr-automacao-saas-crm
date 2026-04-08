const fs = require('fs');
const filepath = 'C:/Users/kelle/Downloads/PR Automação/Bio analise/bio-analise-crm/n8n-workflows/Bio Análise - Atendimento WhatsApp.json';
const json = JSON.parse(fs.readFileSync(filepath, 'utf8'));

// 1. Corrigir o modelo no Preparar Payload OpenAI
let nodePrepararPayload = json.nodes.find(n => n.name === 'Preparar Payload OpenAI');
if (nodePrepararPayload && nodePrepararPayload.parameters.jsCode) {
  nodePrepararPayload.parameters.jsCode = nodePrepararPayload.parameters.jsCode.replace(/'gpt-4\\.1-mini'/g, "'gpt-4o-mini'");
}

// 2. Corrigir o parsing de JSON Markdown no Aplicar Resposta OpenAI
let nodeAplicarResposta = json.nodes.find(n => n.name === 'Aplicar Resposta OpenAI');
if (nodeAplicarResposta && nodeAplicarResposta.parameters.jsCode) {
  nodeAplicarResposta.parameters.jsCode = nodeAplicarResposta.parameters.jsCode.replace(
    /let parsed;\s*try {\s*parsed = typeof raw === 'string' \? JSON\.parse\(raw\) : raw;/m,
    "let parsed;\ntry {\n  let toParse = raw;\n  if (typeof raw === 'string') {\n    toParse = raw.replace(/```json/gi, '').replace(/```/g, '').trim();\n  }\n  parsed = typeof toParse === 'string' ? JSON.parse(toParse) : toParse;"
  );
}

// 3. Corrigir a propriedade do PDF no Processar Exames PDF (de candidates para choices)
let nodeProcessarPDF = json.nodes.find(n => n.name === 'Processar Exames PDF');
if (nodeProcessarPDF && nodeProcessarPDF.parameters.jsCode) {
  nodeProcessarPDF.parameters.jsCode = nodeProcessarPDF.parameters.jsCode.replace(
    /respNode\.candidates\[0\]\.content\.parts\[0\]\.text \|\| '';/g,
    "(respNode.choices && respNode.choices[0] && respNode.choices[0].message && respNode.choices[0].message.content) || '';"
  );
}

const outputPath = 'C:/Users/kelle/Downloads/PR Automação/Bio analise/bio-analise-crm/n8n-workflows/Bio Analise - Atendimento WhatsApp Corrigido.json';
fs.writeFileSync(outputPath, JSON.stringify(json, null, 2), 'utf8');
console.log('Criado: ' + outputPath);
