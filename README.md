# Wavelength Card Generator

A web-based assistant for the board game Wavelength. Randomly draw spectrum cards (in English and Chinese), toggle UI language, and generate new creative spectrum pairs using Gemini LLM.

## ✨ Features
- Toggle between Chinese 🇨🇳 and English 🇬🇧 UI and card text
- Draw a random card from a CSV pool
- Generate a new spectrum pair using Gemini LLM (AI)
- Mobile-friendly, modern UI

## 🛠️ Local Development

1. **Clone the repo:**
   ```sh
   git clone https://github.com/zhaozhichen/wavelength.git
   cd wavelength/web-wavelength
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Set up your Gemini API key:**
   - Copy `.env.example` to `.env.local`
   - Paste your Gemini API key:
     ```sh
     cp .env.example .env.local
     # Edit .env.local and set GEMINI_API_KEY=your_key_here
     ```

4. **Run locally with Vercel dev:**
   ```sh
   npx vercel dev --listen 3000
   ```
   - Open [http://localhost:3000](http://localhost:3000)

## 🚀 Deploy to Vercel

1. **Push your code to GitHub**
2. **Import the repo at [vercel.com](https://vercel.com)**
3. **Set the environment variable** `GEMINI_API_KEY` in Vercel dashboard
4. **Deploy!**

## 🧩 Usage
- **Toggle language**: Click the 🇨🇳/🇬🇧 button
- **Draw random card**: Click 🎲
- **Generate with LLM**: Click 🤖 (uses Gemini to create a new spectrum pair)

## 📁 File Structure
- `public/wavelength.csv` — Card data (English & Chinese)
- `api/generate-card.js` — Vercel serverless function for LLM
- `src/` — React frontend

## 📝 Credits
- Inspired by the board game [Wavelength](https://wavelength.zone/)
- Built by [zhaozhichen](https://github.com/zhaozhichen)

---
PRs and issues welcome! 