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
        <label htmlFor="trgm">Trigram filter</label>
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
