import { useEffect, useRef, useState } from 'react'
import SearchForm from './components/SearchForm'
import EngineColumn from './components/EngineColumn'
import './App.css'

const ENGINES = [
  { key: 'go',     label: 'Go',     endpoint: '/api/search/go'  },
  { key: 'cpp',    label: 'C++',    endpoint: '/api/search/cpp' },
  { key: 'python', label: 'Python', endpoint: '/api/search/py'  },
  { key: 'js',     label: 'JS',     endpoint: null              },
]

const idle    = () => ({ status: 'idle',    durationMs: null, wallClockMs: null, results: [] })
const loading = () => ({ status: 'loading', durationMs: null, wallClockMs: null, results: [] })

export default function App() {
  const [engines, setEngines] = useState(Object.fromEntries(ENGINES.map(e => [e.key, idle()])))
  const [scanned, setScanned] = useState(null)
  const wordsRef       = useRef(null)
  const workerRef      = useRef(null)
  const searchStartRef = useRef(null)

  useEffect(() => {
    const worker = new Worker(new URL('./levenshtein.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }) => {
      const wallClockMs = searchStartRef.current !== null ? Date.now() - searchStartRef.current : null
      setEngine('js', { status: 'done', durationMs: data.duration_ms, wallClockMs, results: data.results })
    }
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  function setEngine(key, val) {
    setEngines(prev => ({ ...prev, [key]: val }))
  }

  async function handleSearch(form) {
    searchStartRef.current = Date.now()
    setEngines(Object.fromEntries(ENGINES.map(e => [e.key, loading()])))
    setScanned(null)

    const body    = JSON.stringify({ word: form.word, delta: form.delta, limit: form.limit, trgm: form.trgm })
    const headers = { 'Content-Type': 'application/json' }

    // Fire server engines in parallel — each updates its column independently
    for (const { key, endpoint } of ENGINES.filter(e => e.endpoint)) {
      fetch(endpoint, { method: 'POST', headers, body })
        .then(r => r.json())
        .then(data => {
          const wallClockMs = searchStartRef.current !== null ? Date.now() - searchStartRef.current : null
          setEngine(key, { status: 'done', durationMs: data.duration_ms, wallClockMs, results: data.results ?? [] })
          if (key === 'go') setScanned(data.candidates_scanned ?? null)
        })
        .catch(() => setEngine(key, { status: 'error', durationMs: null, wallClockMs: null, results: [] }))
    }

    // JS engine: load word list once, then run in Web Worker (non-blocking)
    try {
      if (!wordsRef.current) {
        const res = await fetch('/api/words')
        wordsRef.current = await res.json()
      }
      workerRef.current.postMessage({
        query: form.word, delta: form.delta, limit: form.limit, words: wordsRef.current,
      })
    } catch {
      setEngine('js', { status: 'error', durationMs: null, wallClockMs: null, results: [] })
    }
  }

  const anyLoading = Object.values(engines).some(e => e.status === 'loading')

  return (
    <div className="app">
      <header>
        <h1>nearestword</h1>
        <p>Find dictionary words at a given edit distance — benchmarked across Go, C++, Python, and JavaScript.</p>
      </header>

      <div className="card">
        <SearchForm onSearch={handleSearch} loading={anyLoading} />
      </div>

      {scanned !== null && (
        <div className="meta">
          <span>{scanned.toLocaleString()} candidates scanned</span>
        </div>
      )}

      <div className="grid-header">
        <span className="timing-info">
          ⓘ timing
          <span className="timing-tooltip">
            <strong>algo</strong> — algorithm time measured on the server (pure computation, no network)<br />
            <strong>total</strong> — wall-clock time from search click to result received (includes network round trip)
          </span>
        </span>
      </div>

      <div className="grid">
        {ENGINES.map(({ key, label }) => (
          <EngineColumn key={key} label={label} engine={engines[key]} />
        ))}
      </div>
    </div>
  )
}
