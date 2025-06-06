import { useState, useEffect } from 'react'
import './App.css'

// Emoji for language toggle
const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'zh', label: '🇨🇳 中文' },
]

interface Card {
  chineseL: string
  chineseR: string
  englishL: string
  englishR: string
}

function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [currentCard, setCurrentCard] = useState<Card | null>(null)
  const [lang, setLang] = useState<'en' | 'zh'>('en')
  const [loading, setLoading] = useState(false)
  const [llmCard, setLlmCard] = useState<Card | null>(null)
  const [llmError, setLlmError] = useState<string | null>(null)

  // Load CSV
  useEffect(() => {
    fetch('/wavelength.csv')
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split('\n').slice(1) // skip header
        const parsed: Card[] = lines
          .map((line) => line.split(','))
          .filter((arr) => arr.length === 4)
          .map(([chineseL, chineseR, englishL, englishR]) => ({
            chineseL: chineseL.trim(),
            chineseR: chineseR.trim(),
            englishL: englishL.trim(),
            englishR: englishR.trim(),
          }))
        setCards(parsed)
      })
  }, [])

  // Pick random card
  const pickRandom = () => {
    if (cards.length === 0) return
    const idx = Math.floor(Math.random() * cards.length)
    setCurrentCard(cards[idx])
    setLlmCard(null)
    setLlmError(null)
  }

  // Toggle language
  const toggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'zh' : 'en'))
  }

  // Call LLM backend (to be implemented)
  const generateLLMCard = async () => {
    setLoading(true)
    setLlmError(null)
    setLlmCard(null)
    try {
      const res = await fetch('/api/generate-card')
      if (!res.ok) throw new Error('Failed to generate')
      const data = await res.json()
      setLlmCard(data)
    } catch (e: any) {
      setLlmError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const card = llmCard || currentCard

  return (
    <div className="app-container">
      <h1>Wavelength Card Generator</h1>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
        <button onClick={toggleLang} title="Toggle language">
          {lang === 'en' ? '🇨🇳 中文' : '🇬🇧 English'}
        </button>
        <button onClick={pickRandom} disabled={cards.length === 0}>
          🎲 Random Card
        </button>
        <button onClick={generateLLMCard} disabled={loading}>
          🤖 Generate with LLM
        </button>
      </div>
      {card ? (
        <div className="card-display">
          <div className="spectrum">
            <span className="left">
              {lang === 'en' ? card.englishL : card.chineseL}
            </span>
            <span className="arrow">⬅️➡️</span>
            <span className="right">
              {lang === 'en' ? card.englishR : card.chineseR}
            </span>
          </div>
        </div>
      ) : (
        <p>No card selected yet.</p>
      )}
      {llmError && <p style={{ color: 'red' }}>{llmError}</p>}
    </div>
  )
}

export default App
