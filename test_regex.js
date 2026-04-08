// Test script for exam extraction regex
const fs = require('fs');

function norm(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[?.,!;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeExamAliases(v) {
  return v.trim();
}

function extractExamTerms(raw) {
  const terms = new Set();
  const rawNorm = norm(raw);

  // 1) repeatedExamRegex
  const repeatedExamRegex = /(?:^|,|\be\b|\b(?:fazer|de|para)\b|\n)?\s*(?:uns\s+|um\s+)?exames?\s+de\s+([a-z\u00e0-\u00fa0-9\s\-\/\(\)]+?)(?=(?:,|\be\b|\n|$))/gi;
  for (const m of raw.matchAll(repeatedExamRegex)) {
    if (m[1]) {
      const cleaned = normalizeExamAliases(m[1]);
      terms.add(cleaned);
    }
  }

  // Also split by 'e' if nothing was matched or to extract lists
  if (terms.size === 0) {
      // Just a fallback
  }

  return [...terms];
}

console.log("Original: estou precisando fazer um exame de Ureia e um exame de Creatinina");
console.log("Terms: ", extractExamTerms("estou precisando fazer um exame de Ureia e um exame de Creatinina"));

console.log("Original: glicemia, ureia, vdrl e dengue");
console.log("Terms: ", extractExamTerms("glicemia, ureia, vdrl e dengue"));
