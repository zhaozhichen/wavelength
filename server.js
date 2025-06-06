const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
require('dotenv').config();

const app = express();
const PORT = 8787;

// Read Gemini API key from secret file
const GEMINI_KEY_PATH = path.join(__dirname, '.gemini_api_key');
let GEMINI_API_KEY = '';
if (fs.existsSync(GEMINI_KEY_PATH)) {
  GEMINI_API_KEY = fs.readFileSync(GEMINI_KEY_PATH, 'utf8').split('\n')[0].trim();
}

app.use(cors());
app.use(express.json());

// Helper: get few-shot examples from CSV
function getFewShotExamples() {
  const csvPath = path.join(__dirname, 'public', 'wavelength.csv');
  const csv = fs.readFileSync(csvPath, 'utf8');
  const records = parse(csv, { columns: true, skip_empty_lines: true });
  // Pick 3 random examples
  const shuffled = records.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

// POST /api/generate-card
app.get('/api/generate-card', async (req, res) => {
  // For now, just return a random card from the CSV as a stub
  const examples = getFewShotExamples();
  const card = examples[0];
  res.json({
    chineseL: card['CHINESE L'],
    chineseR: card['CHINESE R'],
    englishL: card['ENGLISH L'],
    englishR: card['ENGLISH R'],
    // TODO: Add real Gemini API call here
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
}); 