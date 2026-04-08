const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n-workflows/Bio Análise - Atendimento WhatsApp.json', 'utf8'));

for (const node of data.nodes) {
  if (node.name === 'Subagente de Triagem') {
    let code = node.parameters.jsCode;
    
    // Replace splitPotentialExams
    code = code.replace(/function splitPotentialExams\(value\) \{[\s\S]*?function extractExamTerms\(\) \{/, 
`function splitPotentialExams(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  const parts = [];
  const lines = raw.replace(/\\r/g, '\\n').split('\\n');
  
  for (const line of lines) {
    let cleaned = line.replace(/^[-•*]\\s*/g, '').replace(/^\\d+[.)-]?\\s*/g, '').trim();
    cleaned = cleaned.replace(/\\b e \\b/gi, ',');
    cleaned = cleaned.replace(/\\b ou \\b/gi, ',');
    
    cleaned.split(/\\s*,\\s*|\\s*;\\s*|\\s*\\/\\s*|\\s*\\+\\s*/g)
      .map(v => v.trim())
      .filter(Boolean)
      .forEach(v => {
        parts.push(v);
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
    
    // Replace repeatedExamRegex
    code = code.replace(/const repeatedExamRegex \= \/\(\?\:\^\|,\|\\be\\b\|\\n\)\\s\*\(\?\:um\\s\+\)\?exame\\s\+de\\s\+\(\[a\-z\\u00e0\-\\u00fa0\-9\\s\\-\\\/\\(\\)\]\+\?\)\(\?\=\(\?:,\|\\be\\b\|\\n\|\$\)\)\/gi;/, 
      `const repeatedExamRegex = /(?:(?:um|uns|uma)\\s+)?exames?\\s+de\\s+([a-z\\u00e0-\\u00fa0-9\\s\\-\\/\\(\\)]+?)(?=(?:,|\\be\\b|\\bou\\b|\\n|$|(?:um|uns|uma)\\s+exames?\\s+de))/gi;`);

    node.parameters.jsCode = code;
  }
  
  if (node.name === 'Subagente Exames e Preparo') {
    let code = node.parameters.jsCode;
    
    code = code.replace(/if \(matchedExams\.length > 1 && includePrice\) \{[\s\S]*?ai_reply_override \= lines\.join\('\\n'\);\n  \}/, 
`if (matchedExams.length > 1 && includePrice) {
    const lines = ['*Resumo*'];
    let totalKnown = 0;
    let totalFullyKnown = true;

    for (const exam of matchedExams) {
      if (exam.valor !== null && exam.valor !== undefined && exam.pode_cotar_whatsapp !== false) {
        lines.push(\`* Exame de \${exam.nome} \${formatMoney(exam.valor)}\`);
        totalKnown += Number(exam.valor || 0);
      } else {
        lines.push(\`* Exame de \${exam.nome} (valor sob confirmação)\`);
        totalFullyKnown = false;
      }
    }

    if (totalFullyKnown) {
      lines.push(\`*VALOR TOTAL=* \${formatMoney(totalKnown)}\`);
    } else {
      lines.push(\`*VALOR TOTAL=* dependente de confirmação\`);
    }

    lines.push('');
    if (saysConvenio || snapshotPaymentType === 'convenio') {
      lines.push('Me informa o nome do convênio para eu seguir com a verificação.');
    } else if (!saysParticular && snapshotPaymentType !== 'particular') {
      lines.push('É convênio ou particular? Se for convênio, me informa o nome para eu verificar.');
    }

    ai_reply_override = lines.join('\\n');
  }`);
    
    code = code.replace(/\} else if \(matchedExams\.length === 1\) \{[\s\S]*?ai_reply_override \= parts\.join\(' '\);\n  \}/, 
`} else if (matchedExams.length === 1) {
    const exam = matchedExams[0];
    const parts = [];

    if (includePrice) {
      parts.push('*Resumo*');
      if (exam.valor !== null && exam.valor !== undefined && exam.pode_cotar_whatsapp !== false) {
        parts.push(\`* Exame de \${exam.nome} \${formatMoney(exam.valor)}\`);
        parts.push(\`*VALOR TOTAL=* \${formatMoney(exam.valor)}\\n\`);
      } else {
        parts.push(\`* Exame de \${exam.nome} (valor sob confirmação)\`);
        parts.push(\`*VALOR TOTAL=* dependente de confirmação\\n\`);
      }
      
      if (saysConvenio || snapshotPaymentType === 'convenio') {
        parts.push('Me informa o nome do convênio para eu seguir com a verificação.');
      } else if (!saysParticular && snapshotPaymentType !== 'particular') {
        parts.push('É convênio ou particular? Se for convênio, me informa o nome para eu verificar.');
      }
      ai_reply_override = parts.join('\\n');
    } else {
      parts.push(\`Encontrei o exame de *\${exam.nome}*.\`);
      if (includePrep) {
        if (exam.precisa_jejum === true) {
          parts.push(exam.horas_jejum ? \`É necessário jejum de *\${exam.horas_jejum} horas*.\` : 'Esse exame precisa de jejum.');
        } else if (exam.precisa_jejum === false) {
          parts.push('Esse exame *não exige jejum*.');
        }
        if (exam.preparo) parts.push(\`Preparo: \${exam.preparo}\`);
      }
  
      if (includeTurnaround) {
        parts.push(\`Prazo de entrega: *\${exam.prazo_entrega || 'confirmar com a equipe'}*.\`);
      }
  
      if (includeSchedule) {
        if (exam.precisa_agendamento === true) parts.push('Esse exame precisa de agendamento.');
        else if (exam.precisa_agendamento === false) parts.push('Esse exame não exige agendamento prévio.');
        else parts.push('Posso te orientar sobre o agendamento desse exame.');
      }
  
      if (!includePrice && !includePrep && !includeTurnaround && !includeSchedule) {
        parts.push('Posso te ajudar com valor, preparo, jejum, prazo ou agendamento.');
      }
      ai_reply_override = parts.join(' ');
    }
  }`);

    node.parameters.jsCode = code;
  }
}

fs.writeFileSync('n8n-workflows/Bio Análise - Atendimento WhatsApp.json', JSON.stringify(data, null, 2));
console.log("Updated JSON");
