const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n-workflows/Bio Análise - Atendimento WhatsApp.json', 'utf8'));

for (const node of data.nodes) {
  // 1. Transcrição (Audio)
  if (node.name === 'Gemini Transcricao') {
    node.name = 'OpenAI Transcricao';
    node.type = 'n8n-nodes-base.httpRequest';
    node.parameters = {
      method: "POST",
      url: "https://api.openai.com/v1/audio/transcriptions",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Authorization", value: "Bearer SUACHAVE_OPENAI_AQUI" }
        ]
      },
      sendBody: true,
      contentType: "multipart-form-data",
      bodyParameters: {
        parameters: [
          { name: "model", value: "whisper-1" },
          { name: "language", value: "pt" }
        ]
      },
      options: {
        bodyContentType: "multipart-form-data"
      },
      sendInputData: true,
      inputDataFieldName: "file" // Evolution API usually downloads binary into 'data' or we need to check what 'Baixar Audio Evolution' outputs. It usually outputs 'data'.
    };
  }

  // 2. Visão Imagem
  if (node.name === 'Gemini Visao Imagem1') {
    node.name = 'OpenAI Visao Imagem';
    node.parameters = {
      method: "POST",
      url: "https://api.openai.com/v1/chat/completions",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Authorization", value: "Bearer SUACHAVE_OPENAI_AQUI" },
          { name: "Content-Type", value: "application/json" }
        ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Você é um assistente especialista em extração de exames médicos de pedidos médicos ou guias. Analise a imagem em anexo e extraia APENAS os nomes dos exames descritos (como hemograma, tgo, tsh, glicemia, etc). Responda com uma lista separada por vírgulas. Não inclua códigos, cid ou saudações. Apenas os nomes." },
              {
                type: "image_url",
                image_url: {
                  url: "data:{{$json.mimetype}};base64,{{$json.base64}}"
                }
              }
            ]
          }
        ],
        max_tokens: 300
      }, null, 2),
      options: {}
    };
  }

  // 3. Visão PDF (Fallback to Image approach if Evolution converts PDF to base64 images, 
  // or we ask GPT-4o-mini to read the raw text. Let's assume the previous node sends base64 PDF. GPT doesn't support PDF base64 payload natively through chat completions without PDF extraction tools. BUT, we can use $json.text if we passed it through a PDF extractor, or change the prompt to warn.)
  if (node.name === 'Gemini Visao PDF1') {
    node.name = 'OpenAI Visao PDF';
    node.parameters = {
      method: "POST",
      url: "https://api.openai.com/v1/chat/completions",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Authorization", value: "Bearer SUACHAVE_OPENAI_AQUI" },
          { name: "Content-Type", value: "application/json" }
        ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: "Você é um assistente de extração de exames médicos. O cliente enviou um arquivo PDF. Como não consigo ler a imagem do PDF diretamente aqui, leia este texto extraído (se houver) e liste os exames: {{$json.text || 'Nenhum texto extraído do PDF.'}}"
          }
        ]
      }, null, 2),
      options: {}
    };
  }
}

for (const node of data.nodes) {
  if (node.name === 'Aplicar Transcricao') {
    // OpenAI Whisper returns { "text": "transcription..." }
    let code = node.parameters.jsCode;
    code = code.replace(/const transcricao = items\[0\]\.json\.candidates\[0\]\.content\.parts\[0\]\.text;/, 
      "const transcricao = items[0].json.text;");
    node.parameters.jsCode = code;
  }
  
  if (node.name === 'Processar Exames Imagem' || node.name === 'Processar Exames PDF') {
    // OpenAI chat completions return { "choices": [{ "message": { "content": "..." } }] }
    let code = node.parameters.jsCode;
    code = code.replace(/const rawText = items\[0\]\.json\.candidates\[0\]\.content\.parts\[0\]\.text;/, 
      "const rawText = items[0].json.choices[0].message.content;");
    node.parameters.jsCode = code;
  }
}

fs.writeFileSync('n8n-workflows/Bio Análise - WhatsApp - OpenAI.json', JSON.stringify(data, null, 2));
console.log("Created OpenAI version JSON.");
