import { useRef, useState } from 'react'
import SearchForm from './components/SearchForm'
import Speedometer from './components/Speedometer'
import CodeBoard from './components/CodeBoard'
import './App.css'

const ENGINES = [
  { key: 'go',   label: 'Go',     endpoint: '/api/search/go'   },
  { key: 'cpp',  label: 'C++',    endpoint: '/api/search/cpp'  },
  { key: 'py',   label: 'Python', endpoint: '/api/search/py'   },
  { key: 'node', label: 'Node.js', endpoint: '/api/search/node' },
]

const idleEng    = () => ({ status: 'idle',    durationMs: null, wallClockMs: null })
const loadingEng = () => ({ status: 'loading', durationMs: null, wallClockMs: null })

export default function App() {
  const [engines, setEngines]       = useState(Object.fromEntries(ENGINES.map(e => [e.key, idleEng()])))
  const [userEngine, setUserEngine] = useState(idleEng())
  const [results, setResults]       = useState({ status: 'idle', words: [] })
  const [showBoard, setShowBoard]   = useState(false)
  const [lastParams, setLastParams] = useState(null)
  const searchStartRef    = useRef(null)
  const goResultsRef      = useRef(null)
  const userResultsRef    = useRef(null)
  const compiledBinaryRef = useRef(null) // { id, lang } | null

  function checkMatch() {
    if (goResultsRef.current === null || userResultsRef.current === null) return
    const matched = JSON.stringify([...goResultsRef.current].sort()) ===
                    JSON.stringify([...userResultsRef.current].sort())
    setUserEngine(prev => prev.status === 'done'
      ? { ...prev, matchStatus: matched ? 'match' : 'mismatch' }
      : prev)
  }

  function setEng(key, val) {
    setEngines(prev => ({ ...prev, [key]: val }))
  }

  function runAll(params, customCode = null, customLang = null, binaryId = null) {
    searchStartRef.current = Date.now()
    goResultsRef.current   = null
    userResultsRef.current = null
    setEngines(Object.fromEntries(ENGINES.map(e => [e.key, loadingEng()])))
    setResults({ status: 'loading', words: [] })
    if (customCode || binaryId) setUserEngine(loadingEng())

    const body    = JSON.stringify({ word: params.word, delta: params.delta, limit: params.limit, trgm: params.trgm })
    const headers = { 'Content-Type': 'application/json' }

    for (const { key, endpoint } of ENGINES) {
      fetch(endpoint, { method: 'POST', headers, body })
        .then(r => r.json())
        .then(data => {
          const wallClockMs = searchStartRef.current != null ? Date.now() - searchStartRef.current : null
          setEng(key, { status: 'done', durationMs: data.duration_ms, wallClockMs })
          if (key === 'go') {
            const words = data.results ?? []
            setResults({ status: 'done', words })
            goResultsRef.current = words
            checkMatch()
          }
        })
        .catch(() => {
          setEng(key, { status: 'error', durationMs: null, wallClockMs: null })
          if (key === 'go') setResults({ status: 'error', words: [] })
        })
    }

    if (customCode) {
      const customBody = JSON.stringify({
        word: params.word, delta: params.delta, limit: params.limit, trgm: params.trgm,
        code: customCode, language: customLang,
      })
      fetch('/api/search/custom', { method: 'POST', headers, body: customBody })
        .then(r => r.json())
        .then(data => {
          const wallClockMs = searchStartRef.current != null ? Date.now() - searchStartRef.current : null
          userResultsRef.current = data.results ?? []
          setUserEngine({ status: 'done', durationMs: data.duration_ms, wallClockMs, matchStatus: null })
          checkMatch()
        })
        .catch(() => setUserEngine({ status: 'error', durationMs: null, wallClockMs: null }))
    }

    if (binaryId) {
      const compiledBody = JSON.stringify({
        word: params.word, delta: params.delta, limit: params.limit, trgm: params.trgm,
        binary_id: binaryId,
      })
      fetch('/api/search/compiled', { method: 'POST', headers, body: compiledBody })
        .then(r => r.json())
        .then(data => {
          const wallClockMs = searchStartRef.current != null ? Date.now() - searchStartRef.current : null
          userResultsRef.current = data.results ?? []
          setUserEngine({ status: 'done', durationMs: data.duration_ms, wallClockMs, matchStatus: null })
          checkMatch()
        })
        .catch(() => setUserEngine({ status: 'error', durationMs: null, wallClockMs: null }))
    }
  }

  function handleSearch(form) {
    setLastParams(form)
    runAll(form)
  }

  function handleCompile(code, lang, callback) {
    compiledBinaryRef.current = null
    const headers = { 'Content-Type': 'application/json' }
    fetch('/api/compile', { method: 'POST', headers, body: JSON.stringify({ code, language: lang }) })
      .then(r => r.json())
      .then(data => {
        if (data.ok) compiledBinaryRef.current = { id: data.binary_id, lang }
        callback(data.ok, data.error || null)
      })
      .catch(() => callback(false, 'request failed'))
  }

  function handleRun(code, lang) {
    if (!lastParams) return
    const bin = compiledBinaryRef.current
    if (bin && bin.lang === lang) {
      runAll(lastParams, null, null, bin.id)
    } else {
      runAll(lastParams, code, lang)
    }
  }

  const anyLoading = Object.values(engines).some(e => e.status === 'loading') || userEngine.status === 'loading'

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
        <p>Type a word, set how many letters off you'll allow, and find every match across a <a href="https://raw.githubusercontent.com/dwyl/english-words/master/words.txt" target="_blank" rel="noreferrer">466k-word dictionary ↗</a> — then watch Go, C++, Python, and Node.js race to find them.</p>
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

      <div className={`gauges-grid${showBoard ? ' five' : ''}`}>
        {ENGINES.map(({ key, label }) => (
          <Speedometer key={key} label={label} engineKey={key} {...engines[key]} />
        ))}
        {showBoard && (
          <Speedometer label="You" engineKey={null} matchStatus={userEngine.matchStatus} {...userEngine} />
        )}
      </div>

      <button className="board-toggle" onClick={() => setShowBoard(v => { if (v) { setUserEngine(idleEng()); compiledBinaryRef.current = null; } return !v; })}>
        <span>&lt;/&gt; Code your own</span>
        <span className={`toggle-chevron${showBoard ? ' open' : ''}`}>▾</span>
      </button>

      {showBoard && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <CodeBoard
            onRun={handleRun}
            onCompile={handleCompile}
            onLangChange={() => { setUserEngine(idleEng()); compiledBinaryRef.current = null; }}
            loading={anyLoading}
            hasParams={!!lastParams}
          />
        </div>
      )}

      <div className="results-panel">
        {results.status === 'idle'    && <p className="hint">results appear here after search</p>}
        {results.status === 'loading' && <p className="hint">searching…</p>}
        {results.status === 'error'   && <p className="error">request failed</p>}
        {results.status === 'done' && (
          results.words.length === 0
            ? <p className="hint">no matches found</p>
            : <>
                <div className="results-words">
                  {results.words.slice(0, 200).map(w => <span key={w} className="result-pill">{w}</span>)}
                </div>
                {results.words.length > 200 && (
                  <p className="hint" style={{ marginTop: 8 }}>…and {results.words.length - 200} more</p>
                )}
              </>
        )}
      </div>
    </div>
  )
}
