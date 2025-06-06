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
function buildPrompt(examples, avoidPairs, category) {
  let prompt = `You are an assistant for the board game Wavelength. Generate a new spectrum pair (opposites) in both English and Chinese. Output as JSON with keys: englishL, englishR, chineseL, chineseR.`;
  
  if (category && category.trim()) {
    prompt += `\n\nCategory: ${category.trim()}. Please generate a spectrum pair related to this category.`;
  }
  
  prompt += `\nHere are some examples:`;
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
  if (category && category.trim()) {
    prompt += ` Make sure it relates to the category: ${category.trim()}.`;
  }
  return prompt;
}

module.exports = async function handler(req, res) {
  console.log('=== API CALLED ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning 200');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('Not POST method - returning 405');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== POST REQUEST PROCESSING ===');

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.log('ERROR: GEMINI_API_KEY not found');
    return res.status(500).json({ error: 'Gemini API key not set in environment variables.' });
  }

  console.log('API key found, length:', GEMINI_API_KEY.length);

  let avoidPairs = [];
  let category = '';
  try {
    console.log('=== PARSING REQUEST BODY ===');
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
    console.log('Raw body:', body);
    if (body) {
      const parsed = JSON.parse(body);
      console.log('Parsed body:', JSON.stringify(parsed, null, 2));
      avoidPairs = parsed.avoidPairs || [];
      category = parsed.category || '';
      console.log('Avoid pairs count:', avoidPairs.length);
      console.log('Category:', category);
    }
  } catch (e) {
    console.log('ERROR parsing request body:', e.message);
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    console.log('=== GETTING FEW-SHOT EXAMPLES ===');
    const examples = getFewShotExamples();
    console.log('Examples retrieved:', examples.length);
    
    console.log('=== BUILDING PROMPT ===');
    const prompt = buildPrompt(examples, avoidPairs, category);
    console.log('Prompt length:', prompt.length);
    console.log('=== FULL PROMPT ===');
    console.log(prompt);
    console.log('=== END PROMPT ===');

    console.log('=== CALLING GEMINI API ===');
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 1.0 },
    };
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    
    console.log('Gemini response status:', response.status);
    console.log('Gemini response headers:', JSON.stringify([...response.headers.entries()]));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('=== GEMINI ERROR RESPONSE ===');
      console.log(errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('=== GEMINI RESPONSE ===');
    console.log(JSON.stringify(data, null, 2));
    
    // Parse the LLM output
    let text = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      text = data.candidates[0].content.parts[0].text;
      console.log('=== EXTRACTED TEXT ===');
      console.log(text);
    } else {
      console.log('ERROR: No valid response from Gemini');
      console.log('Candidates:', data.candidates ? data.candidates.length : 'none');
      if (data.candidates && data.candidates[0]) {
        console.log('First candidate:', JSON.stringify(data.candidates[0], null, 2));
      }
      throw new Error('No valid response from Gemini');
    }
    
    // Try to extract JSON from the response
    console.log('=== EXTRACTING JSON ===');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.log('ERROR: No JSON found in LLM response');
      console.log('Full text:', text);
      throw new Error('No JSON found in LLM response');
    }
    console.log('JSON match:', match[0]);
    const card = JSON.parse(match[0]);
    console.log('=== PARSED CARD ===');
    console.log(JSON.stringify(card, null, 2));
    console.log('=== SUCCESS - RETURNING CARD ===');
    res.json(card);
  } catch (e) {
    console.log('=== ERROR OCCURRED ===');
    console.log('Error message:', e.message);
    console.log('Error stack:', e.stack);
    res.status(500).json({ error: e.message });
  }
} 