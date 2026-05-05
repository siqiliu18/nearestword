import { useEffect, useState } from 'react'

const CX = 60, CY = 52, R = 38, NEEDLE = R
const SLOW = 210, SWEEP = 240
const toRad = d => d * Math.PI / 180

function pt(deg, r = R) {
  return [
    +(CX + r * Math.cos(toRad(deg))).toFixed(2),
    +(CY - r * Math.sin(toRad(deg))).toFixed(2),
  ]
}

// sweep=1 for both track and filled arc so they lie on the same circle.
function arcD(startDeg, sweepDeg) {
  if (sweepDeg < 0.5) return null
  const [sx, sy] = pt(startDeg)
  const [ex, ey] = pt(startDeg - sweepDeg)
  return `M ${sx} ${sy} A ${R} ${R} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${ex} ${ey}`
}

const TRACK = arcD(SLOW, SWEEP)

function msToProgress(ms) {
  if (ms == null || ms < 0) return 0
  const clamped = Math.min(Math.max(ms || 1, 1), 2000)
  return 1 - Math.log(clamped) / Math.log(2000)
}

const TICK_MS = [10, 100, 1000]

export default function Speedometer({ label, status, durationMs, wallClockMs }) {
  const [prog, setProg] = useState(0)

  useEffect(() => {
    if (status !== 'done' || durationMs == null) { setProg(0); return }
    const target = msToProgress(durationMs)
    let start = null, raf
    const tick = ts => {
      if (!start) start = ts
      const t = Math.min((ts - start) / 1000, 1)
      setProg((1 - (1 - t) ** 3) * target)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [status, durationMs])

  const ndDeg = SLOW - prog * SWEEP
  const [nx, ny] = pt(ndDeg, NEEDLE)
  const filled  = arcD(SLOW, prog * SWEEP, 1)
  const color   = prog > 0.65 ? '#1a7a3a' : prog > 0.35 ? '#b07800' : '#c0392b'

  return (
    <div className={`speedometer ${status}`}>
      <div className="sp-label">{label}</div>
      <svg viewBox="0 0 120 100" className="sp-svg">
        {/* Tick marks at 10ms, 100ms, 1000ms */}
        {TICK_MS.map(ms => {
          const deg = SLOW - msToProgress(ms) * SWEEP
          const [ix, iy] = pt(deg, R - 5)
          const [ox, oy] = pt(deg, R + 5)
          return <line key={ms} x1={ix} y1={iy} x2={ox} y2={oy} stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"/>
        })}
        {/* Track */}
        <path d={TRACK} stroke="#ebebeb" strokeWidth="8" fill="none" strokeLinecap="round"/>
        {/* Filled arc */}
        {filled && <path d={filled} stroke={color} strokeWidth="8" fill="none" strokeLinecap="butt"/>}
        {/* Needle */}
        <line x1={CX} y1={CY} x2={nx} y2={ny} stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round"/>
        {/* Pivot */}
        <circle cx={CX} cy={CY} r="4" fill="#1a1a1a"/>
        <circle cx={CX} cy={CY} r="2" fill="#fff"/>
        {/* Value */}
        <text x={CX} y={87} textAnchor="middle" fontSize="11" fontWeight="700"
          fontFamily="system-ui,sans-serif" fill={status === 'done' ? '#1a1a1a' : '#bbb'}>
          {status === 'idle' ? '—' : status === 'loading' ? '…' : `${durationMs}ms`}
        </text>
      </svg>
      {status === 'done' && wallClockMs != null && (
        <div className="sp-total">total {wallClockMs}ms</div>
      )}
      {status === 'error' && <div className="sp-total" style={{ color: '#c0392b' }}>error</div>}
    </div>
  )
}
