import SpeedRpmCluster from './Gauges'

export default function RaceHUD({ telemetry, minimapRef, onPause, onStop, onTouch }) {
  const t = telemetry || { speedKmh: 0, rpm: 1000, gear: 1, lap: 1, totalLaps: 3, position: 1, fieldSize: 1, offTrack: false }

  function press(key, value) {
    onTouch?.({ [key]: value })
  }
  function btnHandlers(key) {
    return {
      onPointerDown: (e) => { e.preventDefault(); press(key, true) },
      onPointerUp: (e) => { e.preventDefault(); press(key, false) },
      onPointerLeave: () => press(key, false),
      onPointerCancel: () => press(key, false),
    }
  }

  return (
    <div className="race-hud">
      <div className="hud-top">
        <div className="hud-pill">
          <span className="hud-label">LAP</span>
          <span className="hud-val">{t.lap}/{t.totalLaps}</span>
        </div>
        <div className="hud-pill">
          <span className="hud-label">POS</span>
          <span className="hud-val">P{t.position}<span className="hud-sub">/{t.fieldSize}</span></span>
        </div>
        {t.offTrack && <div className="hud-pill warn">OFF TRACK</div>}
        <div className="hud-spacer" />
        <button className="hud-btn" onClick={onPause} aria-label="Pause">⏸</button>
        <button className="hud-btn danger" onClick={onStop} aria-label="Stop">⏹</button>
      </div>

      <canvas ref={minimapRef} className="hud-minimap" />

      <div className="hud-bottom">
        <div className="touch-controls touch-steer">
          <button className="touch-btn" {...btnHandlers('left')}>◀</button>
          <button className="touch-btn" {...btnHandlers('right')}>▶</button>
        </div>

        <SpeedRpmCluster speedKmh={t.speedKmh} rpm={t.rpm} gear={t.gear} reverse={t.reverse} />

        <div className="touch-controls touch-pedals">
          <button className="touch-btn brake" {...btnHandlers('brake')}>BRK</button>
          <button className="touch-btn gas" {...btnHandlers('throttle')}>GAS</button>
        </div>
      </div>

      <style>{`
        .race-hud {
          position: absolute; inset: 0; pointer-events: none;
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 16px clamp(12px, 3vw, 28px) clamp(14px, 3vw, 26px);
          font-family: var(--font-body);
          z-index: 5;
        }
        .hud-top { display: flex; align-items: center; gap: 10px; pointer-events: auto; }
        .hud-pill {
          font-family: var(--font-mono); font-size: 12px; color: var(--text-mid);
          background: rgba(10,8,20,0.55); border: 1px solid var(--line);
          border-radius: 999px; padding: 7px 14px; display: flex; gap: 8px; align-items: center;
          backdrop-filter: blur(8px);
        }
        .hud-pill.warn { color: var(--danger); border-color: rgba(255,84,112,0.5); animation: hudPulse 1s ease-in-out infinite; }
        @keyframes hudPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .hud-val { color: var(--text-hi); font-weight: 700; }
        .hud-sub { color: var(--text-low); font-weight: 400; }
        .hud-spacer { flex: 1; }
        .hud-btn {
          width: 38px; height: 38px; border-radius: 50%;
          background: rgba(10,8,20,0.55); border: 1px solid var(--line); color: var(--text-hi);
          font-size: 15px; display: grid; place-items: center; backdrop-filter: blur(8px);
        }
        .hud-btn.danger { border-color: rgba(255,84,112,0.4); color: var(--danger); }
        .hud-minimap {
          position: absolute; top: 64px; right: clamp(12px, 3vw, 28px);
          border-radius: 12px; border: 1px solid var(--line);
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .hud-bottom {
          display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;
          pointer-events: auto;
        }
        .touch-controls { display: flex; gap: 10px; }
        .touch-btn {
          width: 58px; height: 58px; border-radius: 16px;
          background: rgba(15,12,26,0.6); border: 1px solid var(--line); color: var(--text-hi);
          font-size: 18px; font-family: var(--font-display); backdrop-filter: blur(8px);
          touch-action: none; user-select: none;
        }
        .touch-btn:active { background: rgba(255,46,166,0.25); }
        .touch-btn.gas { border-color: rgba(23,232,213,0.5); color: var(--cyan); height: 70px; }
        .touch-btn.brake { border-color: rgba(255,84,112,0.5); color: var(--danger); }
        .touch-pedals { flex-direction: row-reverse; }
        @media (hover: hover) and (pointer: fine) {
          .touch-controls { display: none; }
        }
      `}</style>
    </div>
  )
}
