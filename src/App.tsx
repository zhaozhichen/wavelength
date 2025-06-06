import { useState, useEffect, useRef } from 'react'
import './App.css'

interface Card {
  chineseL: string
  chineseR: string
  englishL: string
  englishR: string
}

// UI text translations
const UI_TEXT = {
  en: {
    title: 'Wavelength Card Generator',
    toggle: '🇨🇳 中文',
    random: '🎲 Random Card',
    llm: '🤖 Generate with LLM',
    noCard: 'No card selected yet.',
  },
  zh: {
    title: '心电感应卡牌生成器',
    toggle: '🇬🇧 English',
    random: '🎲 随机卡牌',
    llm: '🤖 用大模型生成',
    noCard: '尚未选择卡牌。',
  },
};

function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [currentCard, setCurrentCard] = useState<Card | null>(null)
  const [lang, setLang] = useState<'en' | 'zh'>('en')
  const [loading, setLoading] = useState(false)
  const [llmCard, setLlmCard] = useState<Card | null>(null)
  const [llmError, setLlmError] = useState<string | null>(null)
  const generatedLLMCards = useRef<Set<string>>(new Set())

  const t = UI_TEXT[lang];

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

  // Call LLM backend and ensure uniqueness in session
  const generateLLMCard = async () => {
    setLoading(true)
    setLlmError(null)
    setLlmCard(null)
    let attempts = 0
    let card: Card | null = null
    // Send all generated pairs (including the current llmCard and all previous ones)
    const allGeneratedArr = Array.from(generatedLLMCards.current)
    if (llmCard) {
      allGeneratedArr.push(JSON.stringify(llmCard))
    }
    while (attempts < 5) {
      try {
        const res = await fetch('/api/generate-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avoidPairs: allGeneratedArr }),
        })
        if (!res.ok) throw new Error('Failed to generate')
        const data = await res.json()
        const cardStr = JSON.stringify(data)
        if (!generatedLLMCards.current.has(cardStr)) {
          generatedLLMCards.current.add(cardStr)
          card = data
          break
        }
      } catch (e: any) {
        setLlmError(e.message)
        break
      }
      attempts++
    }
    if (card) {
      setLlmCard(card)
    } else {
      setLlmError('No new unique LLM card could be generated after several attempts.')
    }
    setLoading(false)
  }

  const card = llmCard || currentCard

  return (
    <div className="app-container">
      <h1>{t.title}</h1>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
        <button onClick={toggleLang} title="Toggle language">
          {t.toggle}
        </button>
        <button onClick={pickRandom} disabled={cards.length === 0}>
          {t.random}
        </button>
        <button onClick={generateLLMCard} disabled={loading}>
          {t.llm}
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
        <p>{t.noCard}</p>
      )}
      {llmError && <p style={{ color: 'red' }}>{llmError}</p>}
    </div>
  )
}

export default App
