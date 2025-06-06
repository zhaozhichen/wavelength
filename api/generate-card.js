const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const fetch = require('node-fetch');

// Helper: get few-shot examples from CSV
function getFewShotExamples() {
  const csvPath = path.join(process.cwd(), 'public', 'wavelength.csv');
  const csv = fs.readFileSync(csvPath, 'utf8');
  const records = parse(csv, { columns: true, skip_empty_lines: true });
  // Pick 3 random examples
  const shuffled = records.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

// Helper: build prompt for Gemini
function buildPrompt(examples, avoidPairs) {
  let prompt = `You are an assistant for the board game Wavelength. Generate a new spectrum pair (opposites) in both English and Chinese. Output as JSON with keys: englishL, englishR, chineseL, chineseR.\nHere are some examples:`;
  for (const ex of examples) {
    prompt += `\n- English: ${ex['ENGLISH L']} / ${ex['ENGLISH R']}`;
    prompt += `\n  Chinese: ${ex['CHINESE L']} / ${ex['CHINESE R']}`;
  }
  if (avoidPairs && avoidPairs.length > 0) {
    prompt += `\nDo NOT generate any of these pairs (already used this session):`;
    for (const pairStr of avoidPairs) {
      try {
        const pair = JSON.parse(pairStr);
        prompt += `\n- English: ${pair.englishL} / ${pair.englishR}`;
        prompt += `\n  Chinese: ${pair.chineseL} / ${pair.chineseR}`;
      } catch {}
    }
  }
  prompt += `\nNow generate a new, creative pair that is not in the avoid list above.`;
  return prompt;
}

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not set in environment variables.' });
  }

  let avoidPairs = [];
  try {
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
    if (body) {
      const parsed = JSON.parse(body);
      avoidPairs = parsed.avoidPairs || [];
    }
  } catch {}

  const examples = getFewShotExamples();
  const prompt = buildPrompt(examples, avoidPairs);

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 1.0 },
      }),
    });
    const data = await response.json();
    
    // Parse the LLM output
    let text = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      text = data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('No valid response from Gemini');
    }
    
    // Try to extract JSON from the response
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in LLM response');
    const card = JSON.parse(match[0]);
    res.json(card);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
} 