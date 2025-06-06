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
    ai: '🤖 Generate with AI',
    noCard: 'No card selected yet.',
    category: 'Category:',
    customCategory: 'Custom category...',
    categoryNote: '(Only applies to AI generation)',
  },
  zh: {
    title: '心电感应卡牌生成器',
    toggle: '🇬🇧 English',
    random: '🎲 随机卡牌',
    ai: '🤖 用人工智能生成',
    noCard: '尚未选择卡牌。',
    category: '类别：',
    customCategory: '自定义类别...',
    categoryNote: '（仅适用于人工智能生成）',
  },
};

// Category labels by language
const CATEGORY_LABELS = {
  en: {
    any: 'Any',
    music: '🎵 Music',
    food: '🍕 Food & Drink', 
    entertainment: '🎮 Entertainment',
    geography: '🌍 Geography',
    sports: '⚽ Sports',
    art: '🎨 Art & Culture',
    science: '🔬 Science',
    literature: '📚 Literature',
    history: '🏛️ History',
    business: '💼 Business',
    emotions: '🎭 Emotions',
    daily: '🏠 Daily Life',
    custom: 'Custom...',
  },
  zh: {
    any: '任意',
    music: '🎵 音乐',
    food: '🍕 美食',
    entertainment: '🎮 娱乐',
    geography: '🌍 地理',
    sports: '⚽ 体育',
    art: '🎨 艺术',
    science: '🔬 科学',
    literature: '📚 文学',
    history: '🏛️ 历史',
    business: '💼 商业',
    emotions: '🎭 情感',
    daily: '🏠 生活',
    custom: '自定义...',
  },
};

// Get categories for current language
function getCategories(lang: 'en' | 'zh') {
  const labels = CATEGORY_LABELS[lang];
  return [
    { value: '', label: labels.any },
    { value: '🎵 Music', label: labels.music },
    { value: '🍕 Food & Drink', label: labels.food },
    { value: '🎮 Entertainment', label: labels.entertainment },
    { value: '🌍 Geography', label: labels.geography },
    { value: '⚽ Sports', label: labels.sports },
    { value: '🎨 Art & Culture', label: labels.art },
    { value: '🔬 Science', label: labels.science },
    { value: '📚 Literature', label: labels.literature },
    { value: '🏛️ History', label: labels.history },
    { value: '💼 Business', label: labels.business },
    { value: '🎭 Emotions', label: labels.emotions },
    { value: '🏠 Daily Life', label: labels.daily },
    { value: 'custom', label: labels.custom },
  ];
}

function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [currentCard, setCurrentCard] = useState<Card | null>(null)
  const [lang, setLang] = useState<'en' | 'zh'>('en')
  const [loading, setLoading] = useState(false)
  const [aiCard, setAiCard] = useState<Card | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [customCategory, setCustomCategory] = useState<string>('')
  const generatedAICards = useRef<Set<string>>(new Set())

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
    setAiCard(null)
    setAiError(null)
  }

  // Toggle language
  const toggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'zh' : 'en'))
  }

  // Call AI backend and ensure uniqueness in session
  const generateAICard = async () => {
    setLoading(true)
    setAiError(null)
    setAiCard(null)
    let attempts = 0
    let card: Card | null = null
    // Send all generated pairs (including the current aiCard and all previous ones)
    const allGeneratedArr = Array.from(generatedAICards.current)
    if (aiCard) {
      allGeneratedArr.push(JSON.stringify(aiCard))
    }
    
    // Determine the category to use
    const categoryToUse = selectedCategory === 'custom' ? customCategory : selectedCategory
    
    while (attempts < 5) {
      try {
        const res = await fetch('/api/generate-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            avoidPairs: allGeneratedArr,
            category: categoryToUse 
          }),
        })
        if (!res.ok) throw new Error('Failed to generate')
        const data = await res.json()
        const cardStr = JSON.stringify(data)
        if (!generatedAICards.current.has(cardStr)) {
          generatedAICards.current.add(cardStr)
          card = data
          break
        }
      } catch (e: unknown) {
        setAiError(e instanceof Error ? e.message : 'An error occurred')
        break
      }
      attempts++
    }
    if (card) {
      setAiCard(card)
    } else if (!aiError) {
      // Only set the uniqueness error if no other error was already set
      setAiError('No new unique AI card could be generated after several attempts.')
    }
    setLoading(false)
  }

  const card = aiCard || currentCard

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
        <button onClick={generateAICard} disabled={loading}>
          {t.ai}
        </button>
      </div>
      
      {/* Category selection for AI generation */}
      <div style={{ marginBottom: 24, padding: 16, background: '#f6f8fa', borderRadius: 8 }}>
        <div style={{ marginBottom: 12, fontSize: '0.9rem', fontWeight: 500 }}>
          {t.category} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#666' }}>{t.categoryNote}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              background: 'white',
              fontSize: '0.9rem',
              minWidth: '140px'
            }}
          >
            {getCategories(lang).map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {selectedCategory === 'custom' && (
            <input
              type="text"
              placeholder={t.customCategory}
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '0.9rem',
                minWidth: '150px'
              }}
            />
          )}
        </div>
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
      {aiError && <p style={{ color: 'red' }}>{aiError}</p>}
    </div>
  )
}

export default App
