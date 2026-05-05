import { useEffect, useState } from 'react'

export default function EngineColumn({ label, engine }) {
  const { status, durationMs, wallClockMs, results } = engine
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (status !== 'loading') { setElapsed(0); return }
    const start = Date.now()
    const id = setInterval(() => setElapsed(Date.now() - start), 16)
    return () => clearInterval(id)
  }, [status])

  const timeClass =
    status !== 'done' ? '' :
    durationMs < 5   ? 'fast' :
    durationMs < 30  ? 'mid'  : 'slow'

  return (
    <div className={`engine-col ${status}`}>
      <div className="engine-header">
        <span className="engine-label">{label}</span>
        <div className="engine-times">
          {status === 'idle'    && <span className="engine-time">—</span>}
          {status === 'loading' && <span className="engine-time">{elapsed}ms</span>}
          {status === 'error'   && <span className="engine-time error-text">error</span>}
          {status === 'done' && (
            <>
              <span className={`engine-time ${timeClass}`}>algo {durationMs}ms</span>
              {wallClockMs !== null && (
                <span className="engine-time wall">total {wallClockMs}ms</span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="engine-body">
        {status === 'idle'    && <p className="hint">results appear here</p>}
        {status === 'loading' && <p className="searching">searching…</p>}
        {status === 'error'   && <p className="error">request failed</p>}
        {status === 'done' && (
          results.length === 0
            ? <p className="hint">no results</p>
            : results.map(w => <div key={w} className="word">{w}</div>)
        )}
      </div>
    </div>
  )
}
