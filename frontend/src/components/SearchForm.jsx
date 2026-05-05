import { useState } from 'react'

export default function SearchForm({ onSearch, loading }) {
  const [trgm, setTrgm] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    const fd = new FormData(e.target)
    onSearch({
      word:  fd.get('word').trim(),
      delta: parseInt(fd.get('delta')),
      limit: parseInt(fd.get('limit')),
      trgm:  fd.get('trgm') === 'on',
    })
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="word">Word</label>
        <input id="word" name="word" type="text" defaultValue="amazing" required />
      </div>
      <div className="field">
        <label htmlFor="delta">Delta</label>
        <input id="delta" name="delta" type="number" defaultValue={2} min={1} max={5} required />
      </div>
      <div className="field">
        <label htmlFor="limit">Limit</label>
        <input id="limit" name="limit" type="number" defaultValue={10} min={1} max={50} required />
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
