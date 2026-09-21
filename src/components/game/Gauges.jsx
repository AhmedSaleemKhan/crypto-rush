const START_ANGLE = -130
const END_ANGLE = 130

function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

function arcPath(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0)
  const [x1, y1] = polar(cx, cy, r, a1)
  const large = a1 - a0 > 180 ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
}

function Gauge({ frac, redFrom, color, ticks = 8 }) {
  const cx = 60, cy = 60, r = 50
  const clamped = Math.max(0, Math.min(1, frac))
  const needleAngle = START_ANGLE + clamped * (END_ANGLE - START_ANGLE)
  const [nx, ny] = polar(cx, cy, r - 10, needleAngle)
  return (
    <svg viewBox="0 0 120 120" className="gauge-svg">
      <path d={arcPath(cx, cy, r, START_ANGLE, END_ANGLE)} className="gauge-track" />
      {redFrom != null && (
        <path
          d={arcPath(cx, cy, r, START_ANGLE + redFrom * (END_ANGLE - START_ANGLE), END_ANGLE)}
          className="gauge-red"
        />
      )}
      <path d={arcPath(cx, cy, r, START_ANGLE, needleAngle)} className="gauge-fill" style={{ stroke: color }} />
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const a = START_ANGLE + (i / ticks) * (END_ANGLE - START_ANGLE)
        const [x0, y0] = polar(cx, cy, r + 5, a)
        const [x1, y1] = polar(cx, cy, r - 2, a)
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} className="gauge-tick" />
      })}
      <line x1={cx} y1={cy} x2={nx} y2={ny} className="gauge-needle" />
      <circle cx={cx} cy={cy} r={4.5} className="gauge-hub" />
    </svg>
  )
}

export default function SpeedRpmCluster({ speedKmh = 0, rpm = 1000, gear = 1, reverse = false }) {
  const speedFrac = Math.min(1, speedKmh / 260)
  const rpmFrac = Math.min(1, rpm / 8500)
  return (
    <div className="gauge-cluster">
      <div className="gauge-block">
        <Gauge frac={speedFrac} color="#17e8d5" />
        <div className="gauge-readout">
          <span className="gauge-value">{Math.round(speedKmh)}</span>
          <span className="gauge-unit">km/h</span>
        </div>
      </div>
      <div className="gear-pill">{reverse ? 'R' : gear}</div>
      <div className="gauge-block">
        <Gauge frac={rpmFrac} redFrom={7500 / 8500} color="#ff2ea6" ticks={8} />
        <div className="gauge-readout">
          <span className="gauge-value">{(rpm / 1000).toFixed(1)}</span>
          <span className="gauge-unit">×1000 rpm</span>
        </div>
      </div>

      <style>{`
        .gauge-cluster { display: flex; align-items: center; gap: 10px; pointer-events: none; }
        .gauge-block { position: relative; width: 108px; height: 108px; }
        .gauge-svg { width: 100%; height: 100%; overflow: visible; }
        .gauge-track { fill: none; stroke: rgba(255,255,255,0.12); stroke-width: 7; stroke-linecap: round; }
        .gauge-red { fill: none; stroke: rgba(255,84,112,0.55); stroke-width: 7; stroke-linecap: round; }
        .gauge-fill { fill: none; stroke-width: 7; stroke-linecap: round; filter: drop-shadow(0 0 5px currentColor); opacity: 0.95; }
        .gauge-tick { stroke: rgba(255,255,255,0.25); stroke-width: 1.5; }
        .gauge-needle { stroke: #f4f2ff; stroke-width: 2.5; stroke-linecap: round; filter: drop-shadow(0 0 3px rgba(244,242,255,0.8)); }
        .gauge-hub { fill: #f4f2ff; }
        .gauge-readout {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; top: 8px;
        }
        .gauge-value { font-family: var(--font-display); font-size: 20px; color: var(--text-hi); line-height: 1; }
        .gauge-unit { font-family: var(--font-mono); font-size: 9px; color: var(--text-mid); margin-top: 3px; letter-spacing: 0.04em; }
        .gear-pill {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03));
          border: 1px solid var(--line);
          display: grid; place-items: center;
          font-family: var(--font-display); font-size: 17px; color: var(--gold);
          box-shadow: 0 0 16px rgba(255,200,87,0.25);
        }
      `}</style>
    </div>
  )
}
