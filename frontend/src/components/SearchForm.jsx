import { useState } from 'react'

export default function SearchForm({ onSearch, loading }) {
  const [trgm, setTrgm] = useState(false)
  const [noLimit, setNoLimit] = useState(false)
  const [word, setWord] = useState('amazing')
  const [delta, setDelta] = useState(2)

  const maxDelta = Math.max(1, word.trim().length - 1)

  function handleWordChange(e) {
    const w = e.target.value
    setWord(w)
    const newMax = Math.max(1, w.trim().length - 1)
    if (delta > newMax) setDelta(newMax)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    onSearch({
      word:    fd.get('word').trim(),
      delta:   parseInt(fd.get('delta')),
      limit:   noLimit ? 0 : parseInt(fd.get('limit')),
      trgm:    fd.get('trgm') === 'on',
    })
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="word">Word</label>
        <input id="word" name="word" type="text" value={word} onChange={handleWordChange} required />
      </div>
      <div className="field">
        <label htmlFor="delta">Delta</label>
        <input id="delta" name="delta" type="number" value={delta} min={1} max={maxDelta}
          onChange={e => setDelta(Math.min(parseInt(e.target.value) || 1, maxDelta))} required />
      </div>
      <div className="field">
        <label htmlFor="limit">Limit</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {noLimit
            ? <input type="text" disabled value="all" style={{ width: 80, color: '#aaa', background: '#f5f5f5' }} />
            : <input id="limit" name="limit" type="number" defaultValue={10} min={1} max={1000} required />
          }
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input className="checkbox-plain" type="checkbox" checked={noLimit} onChange={e => setNoLimit(e.target.checked)} />
            <span style={{ fontSize: '0.75rem', color: '#666' }}>all</span>
          </label>
        </div>
      </div>
      <div className="field toggle-field">
        <label htmlFor="trgm">
          Trigram filter
          <span className="timing-info" style={{ marginLeft: 4 }}>
            ⓘ
            <span className="timing-tooltip left">
              <strong>Trigram pre-filtering</strong> uses PostgreSQL's pg_trgm index to narrow
              ~466k words down to ~60 candidates before running Levenshtein — making the search
              much faster.<br /><br />
              <strong>Trade-off:</strong> words with low trigram similarity to your query may be
              skipped, even if they're within the edit distance. Turn off for complete (but slower) results.
            </span>
          </span>
        </label>
        <input id="trgm" name="trgm" type="checkbox" checked={trgm} onChange={e => setTrgm(e.target.checked)} />
        <span className="trgm-hint">
          {trgm ? 'faster, may miss some matches' : 'slower, complete results'}
        </span>
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Searching…' : 'Search'}
      </button>
    </form>
  )
}
