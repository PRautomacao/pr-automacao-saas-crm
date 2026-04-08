const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n-workflows/Bio Análise - Atendimento WhatsApp.json', 'utf8'));

for (const node of data.nodes) {
  if (node.name === 'Subagente Exames e Preparo') {
    let code = node.parameters.jsCode;
    
    // Change includePrice logic to default to true when multiple exams are detected or it's a raw generic match
    code = code.replace(/const includePrice = asksPrice \|\| asksTotal \|\| triage\.intent === 'orcamento' \|\| triage\.intent === 'valor' \|\| triage\.intent === 'valor_total' \|\| saysParticular \|\| saysConvenio;/, 
`const includePrice = asksPrice || asksTotal || triage.intent === 'orcamento' || triage.intent === 'valor' || triage.intent === 'valor_total' || saysParticular || saysConvenio || matchedExams.length >= 1;`);

    node.parameters.jsCode = code;
  }
}

fs.writeFileSync('n8n-workflows/Bio Análise - Atendimento WhatsApp.json', JSON.stringify(data, null, 2));
console.log("Updated Exames e Preparo includePrice line.");
