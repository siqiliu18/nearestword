import { useEffect, useRef, useState } from 'react'

function msColor(ms) {
  if (ms == null) return '#1a1a1a'
  if (ms < 50)   return '#1a7a3a'
  if (ms < 500)  return '#b07800'
  return '#c0392b'
}

export default function Speedometer({ label, status, durationMs, wallClockMs, engineKey, matchStatus }) {
  const [elapsed, setElapsed]   = useState(0)
  const [source, setSource]     = useState(null)
  const [showModal, setShowModal] = useState(false)
  const sourceCache = useRef(null)

  useEffect(() => {
    if (status !== 'loading') { setElapsed(0); return }
    const start = Date.now()
    const id = setInterval(() => setElapsed(Date.now() - start), 50)
    return () => clearInterval(id)
  }, [status])

  function handleClick() {
    if (!engineKey) return
    if (sourceCache.current) { setSource(sourceCache.current); setShowModal(true); return }
    fetch(`/api/source/${engineKey}`)
      .then(r => r.text())
      .then(text => { sourceCache.current = text; setSource(text); setShowModal(true) })
      .catch(() => {})
  }

  const displayMs = status === 'loading' ? elapsed : durationMs
  const color = status === 'done' ? msColor(durationMs) : '#bbb'

  return (
    <>
      <div
        className={`speedometer ${status}${engineKey ? ' clickable' : ''}`}
        onClick={handleClick}
      >
        <div className="sp-label">{label}</div>
        {matchStatus !== 'mismatch' && (
          <div className="sp-timer" style={{ color }}>
            {status === 'idle' ? '—' : displayMs == null ? '—' : `${displayMs}ms`}
          </div>
        )}
        {status === 'done' && wallClockMs != null && matchStatus !== 'mismatch' && (
          <div className="sp-total">total {wallClockMs}ms</div>
        )}
        {status === 'error' && <div className="sp-total" style={{ color: '#c0392b' }}>error</div>}
        {matchStatus === 'mismatch' && <div className="sp-match mismatch">✗ wrong answer</div>}
        {engineKey && <div className="sp-hint">click for source code</div>}
      </div>

      {showModal && source && (
        <div className="source-overlay" onClick={() => setShowModal(false)}>
          <div className="source-modal" onClick={e => e.stopPropagation()}>
            <div className="source-modal-header">
              <span>{label} — levenshtein source</span>
              <button className="source-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <pre className="source-modal-code">{source}</pre>
          </div>
        </div>
      )}
    </>
  )
}
