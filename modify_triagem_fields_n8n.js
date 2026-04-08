const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n-workflows/Bio Análise - Atendimento WhatsApp.json', 'utf8'));

for (const node of data.nodes) {
  if (node.name === 'Subagente de Triagem') {
    let code = node.parameters.jsCode;
    
    // Replace schedulingCollectFields array
    const newFields = "const schedulingCollectFields = [\n  'nome_completo',\n  'nome_exame',\n  'data_preferida',\n  'horario_preferido',\n  'tipo_coleta',\n  'endereco_coleta',\n  'telefone_contato',\n  'confirmar_pedido_agendamento',\n  'ajuste_pedido'\n];";
    
    code = code.replace(/const schedulingCollectFields = \[[\s\S]*?\];/, newFields);

    node.parameters.jsCode = code;
  }
}

fs.writeFileSync('n8n-workflows/Bio Análise - Atendimento WhatsApp.json', JSON.stringify(data, null, 2));
console.log("Updated schedulingCollectFields in Triagem JSON.");
