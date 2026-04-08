const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n-workflows/Bio Análise - Atendimento WhatsApp.json', 'utf8'));

for (const node of data.nodes) {
  if (node.name === 'Subagente de Triagem') {
    let code = node.parameters.jsCode;
    
    // Replace splitPotentialExams entirely
    code = code.replace(/function splitPotentialExams\(value\) \{[\s\S]*?function extractExamTerms\(\) \{/, 
`function splitPotentialExams(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  const parts = [];
  const lines = raw.replace(/\\r/g, '\\n').split('\\n');
  
  for (const line of lines) {
    let cleaned = line.replace(/^[-•*]\\s*/g, '').replace(/^\\d+[.)-]?\\s*/g, '').trim();
    
    // Strip conversational intent prefixes
    cleaned = cleaned.replace(/^(?:.*?)(?:quero|preciso|precisando|gostaria|vou)(?:.*?)(?:fazer|agendar|marcar|verificar)\\s+/i, '');
    
    cleaned = cleaned.replace(/\\b e \\b/gi, ',');
    cleaned = cleaned.replace(/\\b ou \\b/gi, ',');
    
    cleaned.split(/\\s*,\\s*|\\s*;\\s*|\\s*\\/\\s*|\\s*\\+\\s*/g)
      .map(v => v.trim())
      .filter(Boolean)
      .forEach(v => {
        parts.push(v);
        
        // Extract what follows "exame de..." even if not at start
        const match = v.match(/(?:exames?\\s+de\\s+)(.+)/i);
        if (match && match[1]) {
          parts.push(match[1].trim());
        }
        
        const noPrefix = v.replace(/^(?:(?:um|uns|uma)\\s+)?exames?\\s+de\\s+/i, '').replace(/^(?:o\\s+)?exame\\s+/i, '');
        if (noPrefix !== v) parts.push(noPrefix.trim());
      });
  }

  return [...new Set(
    parts
      .map(v => normalizeExamAliases(v))
      .filter(Boolean)
      .filter(looksLikeStandaloneExamCandidate)
  )];
}

function extractExamTerms() {`);

    // Replace repeatedExamRegex using string manipulation to avoid regex escaping headaches
    const oldRegexLine = "const repeatedExamRegex = /(?:^|,|\\be\\b|\\n)\\s*(?:um\\s+)?exame\\s+de\\s+([a-z\\u00e0-\\u00fa0-9\\s\\-\\/\\(\\)]+?)(?=(?:,|\\be\\b|\\n|$))/gi;";
    const newRegexLine = "const repeatedExamRegex = /(?:(?:um|uns|uma)\\s+)?exames?\\s+de\\s+([a-z\\u00e0-\\u00fa0-9\\s\\-\\/\\(\\)]+?)(?=(?:,|\\be\\b|\\bou\\b|\\n|$|(?:um|uns|uma)\\s+exames?\\s+de))/gi;";
    
    if (code.includes(oldRegexLine)) {
        code = code.replace(oldRegexLine, newRegexLine);
    }

    node.parameters.jsCode = code;
  }
}

fs.writeFileSync('n8n-workflows/Bio Análise - Atendimento WhatsApp.json', JSON.stringify(data, null, 2));
console.log("Updated Triagem JSON.");
