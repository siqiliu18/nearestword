import { useEffect, useState } from 'react'

function msColor(ms) {
  if (ms == null) return '#1a1a1a'
  if (ms < 50)   return '#1a7a3a'
  if (ms < 500)  return '#b07800'
  return '#c0392b'
}

export default function Speedometer({ label, status, durationMs, wallClockMs }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (status !== 'loading') { setElapsed(0); return }
    const start = Date.now()
    const id = setInterval(() => setElapsed(Date.now() - start), 50)
    return () => clearInterval(id)
  }, [status])

  const displayMs = status === 'loading' ? elapsed : durationMs
  const color = status === 'done' ? msColor(durationMs) : '#bbb'

  return (
    <div className={`speedometer ${status}`}>
      <div className="sp-label">{label}</div>
      <div className="sp-timer" style={{ color }}>
        {status === 'idle' ? '—' : displayMs == null ? '—' : `${displayMs}ms`}
      </div>
      {status === 'done' && wallClockMs != null && (
        <div className="sp-total">total {wallClockMs}ms</div>
      )}
      {status === 'error' && <div className="sp-total" style={{ color: '#c0392b' }}>error</div>}
    </div>
  )
}
