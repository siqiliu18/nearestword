import { useEffect, useRef, useState } from 'react'
import SearchForm from './components/SearchForm'
import Speedometer from './components/Speedometer'
import './App.css'

const ENGINES = [
  { key: 'go',     label: 'Go',     endpoint: '/api/search/go'  },
  { key: 'cpp',    label: 'C++',    endpoint: '/api/search/cpp' },
  { key: 'python', label: 'Python', endpoint: '/api/search/py'  },
  { key: 'js',     label: 'JS',     endpoint: null              },
]

const idleEng    = () => ({ status: 'idle',    durationMs: null, wallClockMs: null })
const loadingEng = () => ({ status: 'loading', durationMs: null, wallClockMs: null })

export default function App() {
  const [engines, setEngines] = useState(Object.fromEntries(ENGINES.map(e => [e.key, idleEng()])))
  const [results, setResults] = useState({ status: 'idle', words: [] })
  const wordsRef       = useRef(null)
  const workerRef      = useRef(null)
  const searchStartRef = useRef(null)

  useEffect(() => {
    const worker = new Worker(new URL('./levenshtein.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }) => {
      const wallClockMs = searchStartRef.current != null ? Date.now() - searchStartRef.current : null
      setEng('js', { status: 'done', durationMs: data.duration_ms, wallClockMs })
    }
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  function setEng(key, val) {
    setEngines(prev => ({ ...prev, [key]: val }))
  }

  async function handleSearch(form) {
    searchStartRef.current = Date.now()
    setEngines(Object.fromEntries(ENGINES.map(e => [e.key, loadingEng()])))
    setResults({ status: 'loading', words: [] })

    const body    = JSON.stringify({ word: form.word, delta: form.delta, limit: form.limit, trgm: form.trgm })
    const headers = { 'Content-Type': 'application/json' }

    for (const { key, endpoint } of ENGINES.filter(e => e.endpoint)) {
      fetch(endpoint, { method: 'POST', headers, body })
        .then(r => r.json())
        .then(data => {
          const wallClockMs = searchStartRef.current != null ? Date.now() - searchStartRef.current : null
          setEng(key, { status: 'done', durationMs: data.duration_ms, wallClockMs })
          if (key === 'go') {
            setResults({ status: 'done', words: data.results ?? [] })
          }
        })
        .catch(() => {
          setEng(key, { status: 'error', durationMs: null, wallClockMs: null })
          if (key === 'go') setResults({ status: 'error', words: [] })
        })
    }

    try {
      if (!wordsRef.current) {
        const res = await fetch('/api/words')
        wordsRef.current = await res.json()
      }
      workerRef.current.postMessage({
        query: form.word, delta: form.delta, limit: form.limit, words: wordsRef.current,
      })
    } catch {
      setEng('js', { status: 'error', durationMs: null, wallClockMs: null })
    }
  }

  const anyLoading = Object.values(engines).some(e => e.status === 'loading')

  return (
    <div className="app">
      <header>
        <h1>
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="#1a1a1a"/>
            <rect x="6"  y="7"  width="5" height="4" fill="white"/>
            <rect x="11" y="7"  width="5" height="4" fill="#666"/>
            <rect x="6"  y="11" width="5" height="4" fill="#666"/>
            <rect x="11" y="11" width="5" height="4" fill="white"/>
            <rect x="6"  y="15" width="5" height="4" fill="white"/>
            <rect x="11" y="15" width="5" height="4" fill="#666"/>
            <rect x="17" y="6" width="2.5" height="21" rx="1.25" fill="#1a1a1a"/>
          </svg>
          EditRace
        </h1>
        <p>Type a word, set how many letters off you'll allow, and find every English dictionary match — then watch Go, C++, Python, and JavaScript race to find them.</p>
      </header>

      <div className="card">
        <SearchForm onSearch={handleSearch} loading={anyLoading} />
      </div>

      <div className="grid-header">
        <span className="timing-info">
          ⓘ timing
          <span className="timing-tooltip">
            <strong>algo</strong> — algorithm time measured on the server (pure computation, no network)<br />
            <strong>total</strong> — wall-clock time from search click to result received (includes network round trip)
          </span>
        </span>
      </div>

      <div className="gauges-grid">
        {ENGINES.map(({ key, label }) => (
          <Speedometer key={key} label={label} {...engines[key]} />
        ))}
      </div>

      <div className="results-panel">
        {results.status === 'idle'    && <p className="hint">results appear here after search</p>}
        {results.status === 'loading' && <p className="hint">searching…</p>}
        {results.status === 'error'   && <p className="error">request failed</p>}
        {results.status === 'done' && (
          results.words.length === 0
            ? <p className="hint">no matches found</p>
            : <div className="results-words">
                {results.words.map(w => <span key={w} className="result-pill">{w}</span>)}
              </div>
        )}
      </div>
    </div>
  )
}
